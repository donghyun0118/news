import { Request, Response, NextFunction } from 'express';

export const validateChangePassword = (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword, newPassword_confirmation } = req.body;

    if (!currentPassword) {
        return res.status(400).json({ field: 'currentPassword', message: '현재 비밀번호를 입력해주세요.' });
    }

    // 새 비밀번호 유효성 검사: 영문, 숫자, 특수문자 포함 10~16자
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,16}$/;
    if (!newPassword || !passwordRegex.test(newPassword)) {
        return res.status(400).json({ field: 'newPassword', message: '새 비밀번호는 영문+숫자+특수문자 10자~16자 사이로 입력해주세요.' });
    }

    // 새 비밀번호 확인
    if (newPassword !== newPassword_confirmation) {
        return res.status(400).json({ field: 'newPassword_confirmation', message: '새 비밀번호가 일치하지 않습니다.' });
    }

    next(); // 모든 유효성 검사 통과
};
