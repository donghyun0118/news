import { Request, Response, NextFunction } from 'express';

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction) => {
    const { nickname, phone } = req.body;

    // 닉네임이 제출된 경우 유효성 검사
    if (nickname !== undefined) {
        const nicknameRegex = /^[a-zA-Z0-9가-힣]{3,10}$/;
        if (typeof nickname !== 'string' || !nicknameRegex.test(nickname)) {
            return res.status(400).json({ field: 'nickname', message: '닉네임은 3~10자의 한글, 영문, 숫자만 사용 가능합니다.' });
        }
    }

    // 휴대폰 번호가 제출된 경우 유효성 검사
    if (phone !== undefined) {
        const phoneRegex = /^\d+$/;
        if (typeof phone !== 'string' || !phoneRegex.test(phone)) {
            return res.status(400).json({ field: 'phone', message: '휴대폰 번호는 숫자만 입력해주세요.' });
        }
    }

    next(); // 모든 유효성 검사 통과
};
