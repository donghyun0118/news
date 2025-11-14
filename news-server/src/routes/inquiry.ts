import express, { Request, Response } from "express";
import path from "path";
import pool from "../config/db";
import { authenticateUser, AuthenticatedRequest } from "../middleware/userAuth";
import { validateInquiry } from "../middleware/inquiryValidation";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// S3 클라이언트 초기화
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * @swagger
 * /api/inquiry/presigned-url:
 *   post:
 *     tags: [Inquiry]
 *     summary: 문의 첨부파일 업로드를 위한 Presigned URL 생성
 *     description: "파일을 S3에 직접 업로드하기 위한 1회용 URL을 생성합니다."
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName, fileType]
 *             properties:
 *               fileName:
 *                 type: string
 *               fileType:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Presigned URL 생성 성공"
 */
router.post("/presigned-url", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const { fileName, fileType } = req.body;
  const userId = req.user?.userId;

  if (!process.env.AWS_S3_BUCKET_NAME) {
    return res.status(500).json({ message: "S3 버킷 이름이 설정되지 않았습니다." });
  }

  const uniqueFileName = `${uuidv4()}-${fileName}`;
  const key = `inquiries/${userId}/${uniqueFileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  try {
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes
    res.json({
      url: presignedUrl,
      filePath: key, // The client will send this back after uploading
    });
  } catch (error) {
    console.error("Error creating presigned URL for inquiry:", error);
    res.status(500).json({ message: "파일 업로드 URL을 생성하는 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /api/inquiry:
 *   post:
 *     tags: [Inquiry]
 *     summary: 사용자 문의 제출 (S3 업로드 방식)
 *     description: "로그인한 사용자가 S3에 파일을 먼저 업로드한 후, 그 경로와 함께 문의를 제출합니다."
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, content, privacy_agreement]
 *             properties:
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *               privacy_agreement:
 *                 type: boolean
 *               filePath:
 *                 type: string
 *                 description: "S3에 업로드된 파일의 경로"
 *               originalName:
 *                 type: string
 *                 description: "원본 파일 이름"
 *     responses:
 *       201:
 *         description: "문의가 성공적으로 제출되었습니다."
 *       400:
 *         description: "필수 입력값 누락 또는 유효성 검사 실패"
 */
router.post("/", authenticateUser, validateInquiry, async (req: AuthenticatedRequest, res: Response) => {
  const { subject, content, filePath, originalName } = req.body;
  const userId = req.user?.userId;

  try {
    await pool.query(
      "INSERT INTO tn_inquiry (user_id, subject, content, file_path, privacy_agreement, file_originalname) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, subject, content, filePath || null, true, originalName || null]
    );
    res.status(201).json({ message: "문의가 성공적으로 제출되었습니다." });
  } catch (error) {
    console.error("Error submitting inquiry:", error);
    res.status(500).json({ message: "문의를 제출하는 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /api/inquiry:
 *   get:
 *     tags:
 *       - Inquiry
 *     summary: 내 문의 내역 목록 조회
 *     description: "로그인한 사용자가 자신이 작성한 모든 문의 내역의 목록을 조회합니다."
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "사용자의 문의 내역 목록"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   subject:
 *                     type: string
 *                   status:
 *                     type: string
 *                     description: "답변 상태 (예: PENDING, REPLIED, RESOLVED)"
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: "인증 실패"
 */
router.get("/", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;

  try {
    const [inquiries] = await pool.query(
      "SELECT id, subject, status, created_at FROM tn_inquiry WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    res.status(200).json(inquiries);
  } catch (error) {
    console.error("Error fetching user inquiries:", error);
    res.status(500).json({ message: "문의 내역을 조회하는 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /api/inquiry/download:
 *   get:
 *     tags:
 *       - Inquiry
 *     summary: 내 문의 첨부파일 다운로드 URL 조회
 *     description: "S3에 저장된 내 문의 첨부파일을 다운로드할 수 있는 임시 URL을 생성합니다."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: "다운로드할 파일의 S3 키 (file_path)"
 *     responses:
 *       200:
 *         description: "다운로드용 Presigned URL"
 *       403:
 *         description: "접근 권한 없음"
 *       404:
 *         description: "파일을 찾을 수 없음"
 */
router.get("/download", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const s3Key = req.query.path as string;
  const userId = req.user?.userId;

  if (!s3Key) {
    return res.status(400).json({ message: "파일 경로가 필요합니다." });
  }
  if (!process.env.AWS_S3_BUCKET_NAME) {
    return res.status(500).json({ message: "S3 버킷 이름이 설정되지 않았습니다." });
  }

  try {
    // Security Check: Verify the file belongs to the logged-in user
    const [inquiryRows]: any = await pool.query(
      "SELECT file_originalname FROM tn_inquiry WHERE file_path = ? AND user_id = ?",
      [s3Key, userId]
    );

    if (inquiryRows.length === 0) {
      return res.status(403).json({ message: "접근 권한이 없거나 파일을 찾을 수 없습니다." });
    }

    const originalName = inquiryRows[0].file_originalname || path.basename(s3Key);

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

    res.json({ url: presignedUrl });

  } catch (error) {
    console.error("Error creating presigned URL for download:", error);
    res.status(500).json({ message: "파일 다운로드 URL을 생성하는 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /api/inquiry/{inquiryId}:
 *   get:
 *     tags:
 *       - Inquiry
 *     summary: 내 특정 문의 상세 조회
 *     description: "로그인한 사용자가 자신이 작성한 특정 문의의 상세 내용과 관리자의 답변을 함께 조회합니다."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inquiryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: "조회할 문의의 ID"
 *     responses:
 *       200:
 *         description: "문의 상세 내용 및 답변"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inquiry:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     subject:
 *                       type: string
 *                     content:
 *                       type: string
 *                     file_path:
 *                       type: string
 *                     file_originalname:
 *                       type: string
 *                     status:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                 reply:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: integer
 *                     content:
 *                       type: string
 *                     created_at:
 *                       type: string
 *       401:
 *         description: "인증 실패"
 *       404:
 *         description: "문의를 찾을 수 없거나 다른 사용자의 문의입니다."
 */
router.get("/:inquiryId", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const { inquiryId } = req.params;
  const userId = req.user?.userId;

  try {
    // 1. 문의 원본 내용 조회 (본인 확인 포함)
    const [inquiryRows]: any = await pool.query(
      "SELECT id, subject, content, file_path, file_originalname, status, created_at FROM tn_inquiry WHERE id = ? AND user_id = ?",
      [inquiryId, userId]
    );

    if (inquiryRows.length === 0) {
      return res.status(404).json({ message: "문의를 찾을 수 없거나 접근 권한이 없습니다." });
    }

    // 2. 답변 내용 조회
    const [replyRows]: any = await pool.query(
        "SELECT id, content, created_at FROM tn_inquiry_reply WHERE inquiry_id = ?",
        [inquiryId]
    );

    res.status(200).json({
      inquiry: inquiryRows[0],
      reply: replyRows.length > 0 ? replyRows[0] : null,
    });
  } catch (error) {
    console.error(`Error fetching inquiry details for ID ${inquiryId}:`, error);
    res.status(500).json({ message: "문의 상세 내역을 조회하는 중 오류가 발생했습니다." });
  }
});

export default router;