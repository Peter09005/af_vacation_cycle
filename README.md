# 공군 성과제 외박 캘린더

Vite + React + Tailwind 기반 단일 페이지 앱입니다.

## 로컬 실행
```bash
npm i
npm run dev
```
브라우저에서 http://localhost:5173 접속

## 빌드
```bash
npm run build
npm run preview
```

## 배포
- Vercel/Netlify: 빌드 명령 `npm run build`, 출력 폴더 `dist`
- Firebase Hosting: `firebase init hosting` → `npm run build` → `firebase deploy`
- AWS S3 + CloudFront: `dist` 폴더 S3 업로드 → CloudFront 배포
