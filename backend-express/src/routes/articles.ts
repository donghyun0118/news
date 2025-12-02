import express, { Response } from "express";
import pool from "../config/db";
import { FAVICON_URLS } from "../config/favicons";
import { AuthenticatedRequest, authenticateUser, optionalAuthenticateUser } from "../middleware/userAuth";

const router = express.Router();

// Helper function to process articles, adding favicon
const processArticles = (articles: any[]) => {
  return articles.map((article) => ({
    ...article,
    favicon_url: FAVICON_URLS[article.source_domain] || null,
  }));
};

/**
 * @swagger
 * components:
 *   schemas:
 *     ArticleWithFavicon:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         source:
 *           type: string
 *         source_domain:
 *           type: string
 *         title:
 *           type: string
 *         url:
 *           type: string
 *         published_at:
 *           type: string
 *           format: date-time
 *         thumbnail_url:
 *           type: string
 *         favicon_url:
 *           type: string
 */

/**
 * @swagger
 * /api/articles/by-category:
 *   get:
 *     tags:
 *       - Articles
 *     summary: "카테고리별 최신 기사 목록 조회 (전체 언론사 통합)"
 *     description: "특정 카테고리의 최신 기사를 조회합니다. 언론사 구분 없이 최근 7일간의 모든 기사를 최신순으로 반환합니다. (side 컬럼 제외)"
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: "조회할 카테고리 이름 (예: 정치, 경제)"
 *     responses:
 *       200:
 *         description: "기사 목록 (최근 7일 전체)"
 */
router.get("/by-category", optionalAuthenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const { name, sources } = req.query;

  if (!name) {
    return res.status(400).json({ message: "카테고리 이름을 'name' 파라미터로 제공해야 합니다." });
  }

  try {
    // User requested to ignore 'sources' filtering and return all articles for the category.
    // Also requested to exclude 'side' column.
    // Also requested to return ALL articles (no limit) within the last 7 days.
    const query = `
      SELECT id, title, description, url, thumbnail_url, published_at, source, source_domain, category
      FROM tn_home_article
      WHERE category = ? AND published_at >= NOW() - INTERVAL 7 DAY
      ORDER BY published_at DESC
    `;
    const params = [name as string];

    const [rows] = await pool.query(query, params);
    res.json(processArticles(rows as any[]));
  } catch (error) {
    console.error("Error fetching articles by category:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/articles/{articleId}/save:
 *   post:
 *     tags:
 *       - Saved Articles
 *     summary: 기사 저장
 *     description: |
 *       로그인한 사용자가 특정 기사를 내 마이페이지에 저장합니다.
 *       저장 시 `article_id`는 항상 `tn_home_article`의 id를 기준으로 통일하여 저장합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: "저장할 기사의 ID ('topic' 또는 'home' 기사)"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [articleType]
 *             properties:
 *               articleType:
 *                 type: string
 *                 enum: [home, topic]
 *                 description: "저장할 기사의 종류. 토픽에 소속된 기사는 'topic', 일반 기사는 'home'"
 *     responses:
 *       201:
 *         description: "기사 저장 성공"
 *       400:
 *         description: "잘못된 articleType"
 *       404:
 *         description: "기사를 찾을 수 없음"
 *       409:
 *         description: "이미 저장된 기사"
 */
router.post("/:articleId/save", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const articleId = req.params.articleId;
  const userId = req.user?.userId;
  const { articleType } = req.body; // 'home' or 'topic'

  if (!articleType || !['home', 'topic'].includes(articleType)) {
    return res.status(400).json({ message: "articleType ('home' or 'topic') is required." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let homeArticleId: number | null = null;

    if (articleType === 'home') {
      const [articleRows]: any = await connection.query("SELECT id FROM tn_home_article WHERE id = ?", [articleId]);
      if (articleRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Article not found in tn_home_article." });
      }
      homeArticleId = parseInt(articleId, 10);
    } else { // articleType === 'topic'
      const [articleRows]: any = await connection.query("SELECT url FROM tn_article WHERE id = ?", [articleId]);
      if (articleRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Article not found in tn_article." });
      }
      const articleUrl = articleRows[0].url;

      const [homeArticleRows]: any = await connection.query("SELECT id FROM tn_home_article WHERE url = ?", [articleUrl]);
      if (homeArticleRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Corresponding article not found in tn_home_article." });
      }
      homeArticleId = homeArticleRows[0].id;
    }

    if (homeArticleId === null) {
        await connection.rollback();
        return res.status(500).json({ message: "Could not determine the article ID to save." });
    }
    
    const [result]: any = await connection.query(
      "INSERT IGNORE INTO tn_user_saved_articles (user_id, article_id) VALUES (?, ?)",
      [userId, homeArticleId]
    );

    if (result.affectedRows === 0) {
      const [existing]: any = await connection.query(
        "SELECT id FROM tn_user_saved_articles WHERE user_id = ? AND article_id = ?",
        [userId, homeArticleId]
      );
      await connection.rollback();
      return res.status(409).json({ 
          message: "Article already saved.",
          data: {
              savedArticleId: existing.length > 0 ? existing[0].id : null
          }
      });
    }

    await connection.commit();
    res.status(201).json({
      message: "Article saved successfully.",
      data: {
        savedArticleId: result.insertId,
        userId,
        articleId: homeArticleId,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error saving article:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
});

/**
 * @swagger
 * /api/articles/{articleId}/save:
 *   delete:
 *     tags:
 *       - Saved Articles
 *     summary: 기사 저장 취소
 *     description: |
 *       로그인한 사용자가 마이페이지에 저장했던 기사를 삭제합니다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: "저장 취소할 기사의 ID ('topic' 또는 'home' 기사)"
 *       - in: query
 *         name: articleType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [home, topic]
 *         description: "저장 취소할 기사의 종류. 'home' 또는 'topic'"
 *     responses:
 *       200:
 *         description: "기사 저장 취소 성공"
 *       400:
 *         description: "잘못된 articleType"
 *       404:
 *         description: "저장된 기사를 찾을 수 없음"
 */
router.delete("/:articleId/save", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const articleId = req.params.articleId;
  const userId = req.user?.userId;
  const { articleType } = req.query; // 'home' or 'topic' from query string

  if (!articleType || (articleType !== 'home' && articleType !== 'topic')) {
      return res.status(400).json({ message: "A valid articleType ('home' or 'topic') is required as a query parameter." });
  }

  const connection = await pool.getConnection();
  try {
      let homeArticleId: number | null = null;

      if (articleType === 'home') {
          homeArticleId = parseInt(articleId, 10);
      } else { // articleType === 'topic'
          const [articleRows]: any = await connection.query("SELECT url FROM tn_article WHERE id = ?", [articleId]);
          if (articleRows.length === 0) {
              return res.status(404).json({ message: "Original topic article not found, cannot determine which article to unsave." });
          }
          const articleUrl = articleRows[0].url;

          const [homeArticleRows]: any = await connection.query("SELECT id FROM tn_home_article WHERE url = ?", [articleUrl]);
          if (homeArticleRows.length === 0) {
               return res.status(404).json({ message: "Corresponding home article not found, cannot unsave." });
          }
          homeArticleId = homeArticleRows[0].id;
      }
      
      if (homeArticleId === null) {
           return res.status(500).json({ message: "Could not determine the article ID to unsave." });
      }

      const [result]: any = await connection.query("DELETE FROM tn_user_saved_articles WHERE user_id = ? AND article_id = ?", [
          userId,
          homeArticleId,
      ]);

      if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Saved article not found." });
      }

      res.status(200).json({ message: "Article unsaved successfully." });
  } catch (error) {
      console.error("Error unsaving article:", error);
      res.status(500).json({ message: "Server error" });
  } finally {
      connection.release();
  }
});

/**
 * @swagger
 * /api/articles/exclusives:
 *   get:
 *     tags:
 *       - Articles
 *     summary: "[단독] 기사 목록 조회"
 *     description: "제목에 '[단독]'이 포함된 기사 목록을 최신순으로 조회합니다."
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: "한 번에 가져올 기사 수"
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: "건너뛸 기사 수 (페이지네이션용)"
 *     responses:
 *       200:
 *         description: "[단독] 기사 목록"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ArticleWithFavicon'
 */
router.get("/exclusives", optionalAuthenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt((req.query.limit as string) || "30", 10);
  const offset = parseInt((req.query.offset as string) || "0", 10);

  try {
    const query = `
      SELECT a.*
      FROM tn_home_article a
      WHERE a.title LIKE '%[단독]%'
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);
    res.json(processArticles(rows as any[]));
  } catch (error) {
    console.error("Error fetching exclusive articles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/articles/breaking:
 *   get:
 *     tags:
 *       - Articles
 *     summary: "[속보] 기사 목록 조회"
 *     description: "제목에 '[속보]'가 포함된 기사 목록을 최신순으로 조회합니다."
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: "한 번에 가져올 기사 수"
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: "건너뛸 기사 수 (페이지네이션용)"
 *     responses:
 *       200:
 *         description: "[속보] 기사 목록"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ArticleWithFavicon'
 */
router.get("/breaking", optionalAuthenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt((req.query.limit as string) || "30", 10);
  const offset = parseInt((req.query.offset as string) || "0", 10);

  try {
    const query = `
      SELECT a.*
      FROM tn_home_article a
      WHERE a.title LIKE '%[속보]%'
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);
    res.json(processArticles(rows as any[]));
  } catch (error) {
    console.error("Error fetching breaking articles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
