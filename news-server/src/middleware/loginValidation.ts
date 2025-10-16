import { Request, Response, NextFunction } from 'express';

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
        return res.status(400).json({ field: 'email', message: '올바른 이메일 형식이 아닙니다.' });
    }

    // 비밀번호 유효성 검사 (비어 있는지 확인)
    if (!password || typeof password !== 'string' || password.length === 0) {
        return res.status(400).json({ field: 'password', message: '비밀번호를 입력해주세요.' });
    }

    next(); // 모든 유효성 검사 통과
};
