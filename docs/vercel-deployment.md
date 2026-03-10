# Vercel 배포 가이드 Vercel Deployment Guide

이 프로젝트는 기존 Node frontend server를 그대로 올리는 방식이 아니라, `browser-only static build`로 변환한 뒤 Vercel에 배포합니다.

핵심 방향:

- server management 없음
- Git push 기반 auto deploy 가능
- save/load는 browser `localStorage` 사용
- Vercel Hobby 플랜에서도 운영 가능한 구조

## 현재 배포 구조 Current Deployment Shape

- Build command: `npm run vercel:build`
- Static output: `vercel-dist/`
- Runtime execution: browser 내 직접 실행
- Save storage: browser `localStorage`

즉, Vercel에는 HTML/CSS/JS static asset만 올라가고, 별도 Node server process는 필요하지 않습니다.

## 배포 전 로컬 검증 Local Verification

```bash
npm install
npm run vercel:build
```

원하면 static output을 직접 띄워 볼 수 있습니다:

```bash
cd vercel-dist
python3 -m http.server 4321
```

그다음 `http://localhost:4321`에서 확인합니다.

## Vercel 프로젝트 설정 Project Settings

Vercel dashboard에서 GitHub repo를 import한 뒤 아래 값을 사용합니다.

- Framework Preset: `Other`
- Build Command: `npm run vercel:build`
- Output Directory: `vercel-dist`

루트에는 이미 `vercel.json`이 포함되어 있어 같은 값을 repository 기준으로도 고정합니다.

## 운영상 주의점 Operational Caveats

- save data는 계정 기반 cloud save가 아니라 `브라우저 로컬 저장`입니다.
- 다른 device나 다른 browser로 접속하면 save가 자동으로 이어지지 않습니다.
- 사용자가 browser storage를 삭제하면 해당 save도 삭제됩니다.
- production analytics나 server-side player account는 현재 포함되어 있지 않습니다.

## 업데이트 흐름 Update Flow

1. GitHub에 push
2. Vercel이 새 commit을 감지
3. `npm run vercel:build` 실행
4. `vercel-dist/`를 static asset으로 배포

즉, 지속 업데이트가 필요한 운영에는 `Git push -> auto deploy` 흐름으로 가면 됩니다.
