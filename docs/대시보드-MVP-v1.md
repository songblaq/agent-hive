# AgentHive Dashboard MVP v1

작성일: 2026-03-09
상태: 초안

## 1. 목표

사용자가 AgentHive 상태를 브라우저에서 바로 확인할 수 있는 최소 웹 UI를 만든다.

핵심은 "예쁘게"보다 "바로 확인 가능하게"다.

## 2. MVP 화면

### 홈
- 등록된 프로젝트 목록
- 각 프로젝트의 task count
- doing / review / blocked 강조

### 프로젝트 상세
- backlog / ready / doing / review / done 칼럼
- task title / priority / owner 표시
- 최근 log 10개
- 최근 decision / review 링크

## 3. 데이터 소스

- source of truth: `~/.agenthive/`
- dashboard는 우선 읽기 전용
- CLI가 상태를 쓰고, dashboard는 상태를 보여준다

## 4. 권장 구조

```text
apps/dashboard/
  src/
    app/
    components/
    lib/
      hub-reader/
```

## 5. MVP 제외 범위

- auth
- multi-user sync
- live websocket
- task 편집
- merge/approval action

## 6. 성공 기준

- 사용자가 브라우저에서 프로젝트 목록을 볼 수 있다
- 특정 프로젝트의 kanban/task 상태를 볼 수 있다
- 최근 activity와 주요 decision을 확인할 수 있다
- 로컬에서 바로 열 수 있는 사이트가 있다
