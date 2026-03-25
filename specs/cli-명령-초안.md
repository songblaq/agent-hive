---
status: draft
last-verified: "2026-03-25"
---

# AgentHive CLI 명령 초안

작성일: 2026-03-09
상태: MVP 범위 초안

## 1. 원칙

- 초기 CLI는 파일 기반 상태를 조작하는 얇은 래퍼여야 한다.
- 데이터베이스나 서버 프로세스에 의존하지 않는다.
- 사람이 직접 파일을 읽어도 이해 가능한 구조를 유지한다.

## 2. MVP 명령

### `agenthive init`
역할:
- 허브 초기화

생성 대상:
- `~/.agenthive/config.yaml`
- `~/.agenthive/registry.yaml`
- `~/.agenthive/PROTOCOL.md`
- `~/.agenthive/agents/`
- `~/.agenthive/projects/`

입력:
- display language
- hub path(optional)
- first project(optional)

### `agenthive project add <path>`
역할:
- 프로젝트 등록

처리:
- 절대경로 정규화
- slug 생성
- registry 반영
- project 디렉터리 생성

### `agenthive project list`
역할:
- 등록 프로젝트 목록 출력

### `agenthive task create`
역할:
- task 폴더와 기본 문서 생성

생성 대상 예시:
- `task.yaml`
- `plan.md`
- `summary.md`
- `messages/`
- `reviews/`
- `artifacts/`

### `agenthive task claim <task-id>`
역할:
- task 소유권 획득

처리:
- lock 파일 생성
- owner/role 반영
- 상태를 `doing`으로 변경

### `agenthive task complete <task-id>`
역할:
- task 종료 처리

처리:
- lock 해제
- 상태를 `done`으로 변경

### `agenthive status [project]`
역할:
- 현재 task 상태 출력

출력:
- backlog / ready / doing / review / done
- owner 표시
- blocked 여부 표시

### `agenthive setup <tool>`
역할:
- 도구별 포인터 파일 생성

대상 예시:
- `claude`
- `cursor`
- `copilot`
- `codex`

## 3. 후속 명령 후보

- `agenthive link`
- `agenthive vote`
- `agenthive task handoff`
- `agenthive lock renew`
- `agenthive doctor`

## 4. 비목표

MVP에서는 아래를 하지 않는다.

- 자동 작업 할당
- 데몬 기반 watcher
- 웹 대시보드
- 외부 SaaS 강결합
- 실시간 멀티유저 동기화 서버
