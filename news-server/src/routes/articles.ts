import { Router, Request, Response } from "express";
import pool from "../config/db";

const router = Router();

/**
 * @swagger
 * /api/articles:
 *   get:
 *     tags:
 *       - Articles
 *     summary: 최신 기사 목록 조회
 *     description: 자동 수집된 최신 기사 목록을 최신순으로 30개까지 조회합니다.
 *     responses:
 *       200:
 *         description: 최신 기사 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   source:
 *                     type: string
 *                   source_domain:
 *                     type: string
 *                   category:
 *                     type: string
 *                   title:
 *                     type: string
 *                   url:
 *                     type: string
 *                   published_at:
 *                     type: string
 *                     format: date-time
 *                   view_count:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: 서버 내부 오류
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tn_home_article ORDER BY COALESCE(published_at, created_at) DESC LIMIT 30"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching latest articles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
