const bcrypt = require("bcryptjs");

// 옅에 'your-password' 부분에 관리자용 비밀번호를 입력하세요.
const password = "rs00mk@@";

if (!password || password === "your-password") {
  console.error("Please provide a password inside the script.");
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log(`\nPassword: ${password}`);
console.log("============================================================");
console.log("Bcrypt Hash (이 값을 복사해서 DB에 사용하세요):");
console.log(hash);
console.log("============================================================");
