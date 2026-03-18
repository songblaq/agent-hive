# AgentHive Two-Track Operation v1

작성일: 2026-03-11
상태: 우선 구현 설계

## 1. 목표

AgentHive가 두 트랙으로 내부적으로 동작하게 만든다.
이렇게 하면 사용자가 매번 직접 요청하지 않아도, 기본 운영은 하이브 내부 루프로 계속 진행된다.

## 2. 두 트랙 정의

### Track A — External Assist Entry
- 사람 또는 외부 오케스트레이터(OpenClaw)가 먼저 요청을 넣는다.
- 요청은 AgentHive 프로젝트/task로 정규화된다.
- 이후 흐름은 내부 코어와 동일하다.

### Track B — Internal Hive Entry
- AgentHive 자체 queue / cron / event 규칙이 먼저 동작한다.
- 하이브가 스스로 다음 task를 고르고, 필요 시 worker를 호출한다.
- 이것이 기본 운영 모드가 된다.

## 3. 핵심 원칙

- **기본값은 Track B**다.
- Track A는 수동 개입/지휘/급한 요청/방향 수정에 강하다.
- 두 트랙은 진입점만 다르고, 작업 코어는 동일해야 한다.

## 4. 공통 작업 코어

모든 작업은 아래 흐름으로 수렴한다.

1. project resolve
2. task pick 또는 task create
3. scope / acceptance 확인
4. workspace policy resolve
5. worker assignment
6. 실행
7. summary / review / log 반영
8. next action 결정

workspace policy 기준:

- shared workspace는 조정, backlog 관리, 경량 docs 작업에 한정한다.
- builder/reviewer 작업은 Track A와 Track B 모두 task 단위 worktree를 기본값으로 둔다.
- 상세 규칙은 `docs/agenthive-workspace-worktree-policy-v1.md`를 따른다.

## 5. 내부적으로 먼저 구현할 것

### Phase 1
- Track B용 cron/queue 루프를 하이브 운영 기본값으로 명시
- project level up / skill-role / review-deepwork 루프를 하이브 표준 루프로 연결
- 후속 task 생성 규칙을 보수적으로 도입

### Phase 2
- queue picker 규칙 정의
- event 감지 규칙 정의
- task 상태와 dispatch 상태 연결

### Phase 3
- GitHub issue autopilot, workspace/worktree provisioning, PR 흐름 연결

## 6. 내부 운영 규칙

- 사람이 호출하지 않아도 하이브는 Track B 루프로 계속 점검한다.
- 사람이 개입하면 Track A로 들어오되, 같은 task 코어에 합류한다.
- 두 트랙 모두 dispatch 전에 같은 workspace/worktree 정책을 통과해야 한다.
- Dashboard는 이 두 트랙을 구분해 보여줄 수 있으면 좋다.

Track B의 대표 event source:

- cron 기반 review/deepwork 루프
- queue picker가 고른 backlog/ready task
- GitHub issue event intake

GitHub issue event는 Track B로 들어오더라도 바로 builder를 붙이지 않는다.
반드시 카드 생성, scope 확인, workspace 준비, review gate 규칙을 먼저 통과한다.
상세 규칙은 `docs/agenthive-github-issue-autopilot-rule-v1.md`를 따른다.

## 7. 성공 기준

- 사용자가 별도 지시하지 않아도 AgentHive 프로젝트가 주기적으로 점검된다.
- 하이브가 다음 action 후보를 스스로 고른다.
- 수동 요청과 자율 루프가 같은 task 체계를 공유한다.
