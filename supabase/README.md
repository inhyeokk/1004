# Supabase 방명록 연결

## 1. 프로젝트 생성

Supabase에서 새 프로젝트를 만든 뒤 `Project Settings → API`에서 다음 값을 확인합니다.

- Project URL
- Publishable anon key

## 2. 테이블 생성

Supabase의 `SQL Editor`에서 `schema.sql` 전체를 실행합니다.

## 3. 청첩장에 연결

`js/supabase-config.js`에 값을 입력합니다.

```js
window.WEDDING_SUPABASE = {
    url: "https://your-project.supabase.co",
    anonKey: "your-publishable-anon-key"
};
```

anon key는 브라우저에 공개되는 키이므로 비밀 키를 넣지 않습니다. 테이블 접근 권한은 `schema.sql`의 Row Level Security 정책으로 제한합니다.

설정값을 입력한 뒤 GitHub Pages에 다시 배포하면 모든 방문자가 같은 방명록을 읽고 새 메시지를 등록할 수 있습니다.
