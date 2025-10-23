import { Request, Response, NextFunction } from 'express';

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction) => {
    const { nickname, profile_image_url, introduction } = req.body;

    // 닉네임이 제출된 경우 유효성 검사
    if (nickname !== undefined) {
        const nicknameRegex = /^[a-zA-Z0-9가-힣]{3,10}$/;
        if (typeof nickname !== 'string' || !nicknameRegex.test(nickname)) {
            return res.status(400).json({ field: 'nickname', message: '닉네임은 3~10자의 한글, 영문, 숫자만 사용 가능합니다.' });
        }
    }

    // 프로필 이미지 URL이 제출된 경우 유효성 검사
    if (profile_image_url !== undefined) {
        if (typeof profile_image_url !== 'string' || profile_image_url.trim().length === 0) {
            return res.status(400).json({ field: 'profile_image_url', message: '잘못된 프로필 이미지 URL입니다.' });
        }
    }

    // 자기소개가 제출된 경우 유효성 검사
    if (introduction !== undefined) {
        if (typeof introduction !== 'string' || introduction.length > 255) {
            return res.status(400).json({ field: 'introduction', message: '자기소개는 255자 이하로 입력해주세요.' });
        }
    }

    next(); // 모든 유효성 검사 통과
};
