import { Request, Response, NextFunction } from 'express';

export const validateSignup = (req: Request, res: Response, next: NextFunction) => {
    const { email, password, password_confirmation, name, nickname, phone } = req.body;

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ field: 'email', message: '이메일 형식에 맞지 않습니다.' });
    }

    // 비밀번호 유효성 검사: 영문, 숫자, 특수문자 포함 10~16자
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,16}$/;
    if (!password || !passwordRegex.test(password)) {
        return res.status(400).json({ field: 'password', message: '영문+숫자+특수문자 10자~16자 사이로 입력해주세요.' });
    }

    // 비밀번호 확인
    if (password !== password_confirmation) {
        return res.status(400).json({ field: 'password_confirmation', message: '비밀번호가 일치하지 않습니다.' });
    }

    // 이름 유효성 검사: 최소 2자 이상, 한글 또는 영문
    const nameRegex = /^[a-zA-Z가-힣]{2,}$/;
    if (!name || !nameRegex.test(name)) {
        return res.status(400).json({ field: 'name', message: '이름은 2자 이상의 한글 또는 영문이어야 합니다.' });
    }

    // 닉네임 유효성 검사: 3~10자, 특수문자 불가
    const nicknameRegex = /^[a-zA-Z0-9가-힣]{3,10}$/;
    if (!nickname || !nicknameRegex.test(nickname)) {
        return res.status(400).json({ field: 'nickname', message: '닉네임은 3~10자의 한글, 영문, 숫자만 사용 가능합니다.' });
    }

    // 휴대폰 번호 유효성 검사: 숫자만
    const phoneRegex = /^\d+$/;
    if (!phone || !phoneRegex.test(phone)) {
        return res.status(400).json({ field: 'phone', message: '휴대폰 번호는 숫자만 입력해주세요.' });
    }

    next(); // 모든 유효성 검사 통과
};