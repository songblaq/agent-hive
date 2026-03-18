# AgentHive Workspace / Worktree Policy v1

작성일: 2026-03-11
상태: 운영 정책 초안

## 1. 목표

여러 에이전트가 같은 프로젝트에서 동시에 작업할 때, git 충돌과 작업공간 오염을 줄이기 위한 기본 정책을 정의한다.

이 문서는 Track A(외부 개입)와 Track B(내부 하이브 루프) 모두에 적용되는 공통 규칙이다.

## 2. 기본 원칙

- 기본 checkout은 coordination workspace로 취급한다.
- 구현, 검증, 리뷰처럼 변경 가능성이 있는 작업은 task 단위 격리 worktree를 기본값으로 둔다.
- 한 task는 동시에 하나의 mutable workspace만 소유한다.
- scope가 불명확하거나 충돌 가능성을 빨리 판단하기 어려우면 shared workspace가 아니라 isolated worktree로 떨어진다.
- reviewer는 builder의 작업공간을 재사용하지 않는다.

## 3. 작업공간 종류

| 종류 | 용도 | 기본 허용 작업 |
|------|------|----------------|
| Shared workspace | 조정, 문서 확인, backlog 정리, 경량 문서 수정 | planner/researcher 작업, 단일 owner의 docs-only 변경 |
| Task worktree | 구현, 테스트, 생성물 변경, git 조작 | builder 작업 전체 |
| Review worktree | diff 검토, 재현 확인, 승인 판단 | reviewer 작업 전체 |

## 4. 선택 규칙

### Shared workspace를 써도 되는 경우

- 선언된 scope가 `docs/**`, `context/**`, task 메타데이터처럼 충돌 범위가 작다.
- 현재 repo에서 동시에 움직이는 다른 active task와 파일 범위가 겹치지 않는다.
- branch 전환, rebase, dependency 변경, generated file 갱신이 필요 없다.

### Isolated task worktree가 필요한 경우

- 코드, 테스트, 스크립트, 설정, 생성물을 수정한다.
- 같은 repo에서 둘 이상의 builder가 병렬로 움직인다.
- scope가 넓거나 `src/**`, `apps/**`, `specs/**`처럼 파급 범위가 크다.
- branch 생성, cherry-pick, rebase, merge-base 비교 같은 git 작업이 필요하다.
- 자동화 루프가 사람이 지켜보지 않는 상태에서 task를 집는다.

### Review worktree가 필요한 경우

- reviewer가 builder diff를 독립적으로 검토해야 한다.
- reviewer가 검증 중 임시 수정이나 재현 파일을 만들 수 있다.
- builder workspace에 남아 있는 unstaged 변경이 review 신뢰도를 해칠 수 있다.

## 5. 표준 경로와 naming

git 저장소는 아래 위치를 기본값으로 사용한다.

`~/.agenthive/worktrees/{project-slug}/{task-id}-{role}-{agent-id}`

git이 없는 프로젝트나 실험용 복사본은 아래 위치를 사용한다.

`~/.agenthive/workspaces/{project-slug}/{task-id}-{role}-{agent-id}`

추가 규칙:

- repo 루트 checkout은 coordination workspace이며, 병렬 builder의 주 작업공간으로 쓰지 않는다.
- git worktree를 쓰는 task의 branch 이름은 `agent/{agent-id}/{task-id}`를 기본값으로 둔다.
- reviewer는 `{task-id}-reviewer-{agent-id}` 형식의 별도 경로를 사용한다.

## 6. 운영 절차

1. task를 claim하고 scope를 먼저 확인한다.
2. dispatch 전에 `shared` 또는 `isolated` workspace 모드를 결정한다.
3. isolated가 필요하면 worktree/workspace를 만들고 경로를 task log 또는 lock 메타데이터에 남긴다.
4. builder는 자신이 소유한 task worktree 안에서만 mutable 작업을 수행한다.
5. reviewer는 builder workspace를 재사용하지 않고 review worktree 또는 clean checkout에서 검증한다.
6. handoff, summary, review가 끝나면 worktree 정리 책임자를 남기고 cleanup한다.

## 7. 충돌 방지 규칙

- active task 둘이 같은 mutable worktree 경로를 공유하면 안 된다.
- active task 둘의 파일 scope가 겹치면 병렬 실행이 아니라 scope 재조정 또는 순차 실행으로 바꾼다.
- shared workspace에서 unstaged 변경이 생겼다면 새로운 task를 추가로 집기 전에 정리하거나 격리 worktree로 이동한다.
- autopilot이나 queue picker는 판단이 애매하면 shared workspace를 재사용하지 말고 isolated worktree를 선택한다.

## 8. 현재 운영 모델과의 연결

- Dispatch Model v1에서는 `scope 확인 -> workspace policy resolve -> worker dispatch` 순서를 기본 코어로 본다.
- Two-Track Operation v1에서는 Track A와 Track B 모두 같은 workspace policy를 호출한다.
- State Diagram v1에서는 dispatch 흐름에 `workspace_prepared` 상태를 넣어 격리 준비 단계를 드러낸다.
- GitHub Issue Autopilot Rule v1에서는 issue intake는 coordination workspace에서, build/review는 분리 worktree에서 수행한다.

관련 문서:

- [docs/agenthive-dispatch-model-v1.md](./agenthive-dispatch-model-v1.md)
- [docs/agenthive-two-track-operation-v1.md](./agenthive-two-track-operation-v1.md)
- [docs/agenthive-state-diagram-v1.md](./agenthive-state-diagram-v1.md)
- [docs/agenthive-github-issue-autopilot-rule-v1.md](./agenthive-github-issue-autopilot-rule-v1.md)
