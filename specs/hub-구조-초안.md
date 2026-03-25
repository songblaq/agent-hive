---
status: implemented
last-verified: "2026-03-25"
---

# AgentHive Hub 구조 초안

작성일: 2026-03-09
상태: MVP 초안

## 1. 기본 경로

기본 허브 경로:
- `~/.agenthive/`

## 2. 디렉터리 구조

```text
~/.agenthive/
├── config.yaml
├── PROTOCOL.md
├── registry.yaml
├── agents/
│   ├── claude-code.yaml
│   ├── codex.yaml
│   └── opencode.yaml
└── projects/
    └── {parent_slug}/
        └── {project_name}/
            ├── project.yaml
            ├── context/
            ├── tasks/
            │   ├── BACKLOG.md
            │   └── TASK-001-example/
            │       ├── task.yaml
            │       ├── plan.md
            │       ├── summary.md
            │       ├── messages/
            │       ├── reviews/
            │       ├── artifacts/
            │       └── lock.yaml
            ├── decisions/
            ├── threads/
            └── log/
```

## 3. 상태 저장 원칙

- hub가 실제 상태의 source of truth다.
- project repo에는 운영 상태를 기본 저장하지 않는다.
- project repo에는 포인터와 규칙만 둔다.

## 4. 프로젝트 식별 규칙

slug 형식:
- `projects/{parent_path_slug}/{project_name}`

경로 변환 규칙:
- 절대경로의 parent path를 기준으로 slug 생성
- `/`는 `--`로 치환
- 실제 디렉터리명 `_`는 그대로 유지

예시:
- `/Users/alice/projects/agent-hive`
- parent slug: `Users--alice--projects`
- project name: `agent-hive`

예상 프로젝트 hub 경로:
- `~/.agenthive/projects/Users--alice--projects/agent-hive/`

## 5. 최소 파일 책임

### config.yaml
- 전역 설정
- display language
- hub path
- internal language

### registry.yaml
- slug ↔ 실제 경로 매핑
- 활성 프로젝트 목록

### project.yaml
- 프로젝트 메타데이터
- git 정보
- branch 규칙
- review 정책
- active agents

### task.yaml
- 상태, 우선순위, owner, scope, acceptance 정의

### lock.yaml
- task claim 상태와 lease 정보

## 6. MVP 주의사항

- lock lease 자동 만료는 아직 보수적으로 운영한다.
- overlap 검사는 먼저 문서 규칙 + 수동 검토로 시작한다.
- append-only 메시지와 로그 규칙을 우선 지킨다.
