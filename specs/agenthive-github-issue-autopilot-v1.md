# AgentHive GitHub Issue Autopilot v1

- 작성일: 2026-03-11
- 상태: Draft v1
- 범위: AgentHive Core TASK-003

## 1. 목적

이 문서는 GitHub issue를 입력으로 받아 AgentHive가 **task 생성 -> plan -> build -> review -> PR/comment/report** 루프를 어떤 조건에서 자동으로 수행할지 정의한다.

핵심 목표:
- 자동 실행 가능한 범위와 인간 승인 필요 범위를 명확히 분리
- label / priority / risk 기반 dispatch 규칙 고정
- 실패 / retry / escalation 규칙 고정

## 2. 비범위

이 문서는 아래를 상세 구현하지 않는다.
- GitHub App/토큰 배포 세부 절차
- PR 템플릿 세부 포맷
- dashboard 상세 UI
- 저장소별 예외 allowlist의 실제 값 자체

## 3. Core loop

기본 루프:
1. `issue intake`
2. `task creation`
3. `plan`
4. `build`
5. `review gate`
6. `PR/comment/report`
7. `close / await human / retry / escalate`

원칙:
- issue는 곧바로 build로 가지 않는다.
- review gate를 통과하지 못한 자동 작업은 release/merge 단계로 갈 수 없다.
- autopilot은 task system 위에서 동작하며 source of truth는 AgentHive task/log/evidence다.

## 4. 입력 조건 (Issue intake rule)

issue가 autopilot 후보가 되려면 아래를 만족해야 한다.
- repo가 allowlist 또는 허용된 조직 범위 안에 있다
- issue 상태가 `open`이다
- issue body/title이 비어 있지 않다
- 최소 하나 이상의 분류 가능 신호(label, component, bug/feature type, priority hint)가 있다
- 명백한 정책 금지 항목이 없다

추가 intake 메타:
- `repo`
- `issue_number`
- `labels[]`
- `priority`
- `risk`
- `requires_human_approval`
- `autopilot_mode` (`propose_only`, `plan_only`, `build_allowed`)

## 5. 자동 실행 범위 vs 인간 승인 범위

### 5-1. 자동 실행 가능 범위
아래는 기본적으로 autopilot이 진행 가능하다.
- 문서 수정
- 테스트 보강
- 저위험 리팩터링
- 명백한 bug fix with bounded scope
- 기존 policy/allowlist 안의 repo에서 branch + PR 초안 생성

필수 조건:
- risk가 `low`
- protected branch 직접 push 금지
- worktree policy 충족
- review gate evidence 생성 가능

### 5-2. 인간 승인 필요 범위
아래는 인간 승인 없이는 build 이상 진행하지 않는다.
- risk가 `medium` 이상
- 인증/권한/결제/보안 영향
- destructive infra/data 변경
- 외부 서비스 토큰/secret 필요
- 범위가 크거나 repo rule이 불명확함
- 법무/정책/브랜드 리스크
- 자동 판단만으로 `approve`, `waive`, `done -> release`, direct merge/close를 시도하는 경우

명시 규칙:
- autopilot은 사람을 대신해 최종 `approve` 또는 `waive`를 확정하지 않는다.
- autopilot은 review gate evidence를 준비하고 제안할 수는 있지만, gate를 열어 release를 허용하는 최종 결정은 reviewer/owner/operator가 가진다.

### 5-3. propose-only 범위
아래는 issue 분석과 실행 계획 제안까지만 허용한다.
- high-risk architecture change
- policy-ambiguous request
- upstream dependency wait 상태
- 외부 인간 결정을 먼저 받아야 하는 작업

## 6. Label / Priority / Risk dispatch matrix

| Signal | Default mode | Notes |
|---|---|---|
| `docs`, `documentation` | `build_allowed` | 문서 수정 자동 가능 |
| `test`, `qa` | `build_allowed` | bounded test/task 허용 |
| `bug` + `low-risk` | `build_allowed` | scope 명확할 때 |
| `enhancement` | `plan_only` | 구현 전 사람 검토 권장 |
| `security`, `auth`, `billing`, `infra` | `propose_only` | human approval 필수 |
| `blocked`, `needs-info`, `policy` | `propose_only` | 정보/정책 먼저 |
| `p0`, `p1` | `plan_only` 이상 | urgency 높아도 human 확인 우선 |
| `p2`, `p3` + `low-risk` | `build_allowed` 가능 | repo allowlist 전제 |

Risk tier 기본 해석:
- `low`: bounded diff, rollback 쉬움, secret 없음
- `medium`: 여러 파일/흐름 영향, repo rule 확인 필요
- `high`: 보안/금전/infra/데이터 파괴 가능성 포함

충돌 우선순위 규칙:
- 여러 signal이 동시에 붙으면 **가장 보수적인 모드가 우선**한다.
- 예: `bug + low-risk`와 `security`가 같이 있으면 `propose_only`가 이긴다.
- 예: `docs`라도 `p1` 또는 `policy`가 붙으면 최소 `plan_only` 이상으로 승격한다.
- 분류가 애매하면 fail-open이 아니라 **fail-closed**로 `needs_human_approval=true`를 설정한다.

## 7. 단계별 실행 규칙

### 7-1. Issue -> Task
- issue당 AgentHive task 1개를 기본으로 생성
- task id에는 repo + issue number가 추적 가능해야 한다
- issue 원문은 요약해 task objective / constraints / acceptance로 변환한다

### 7-2. Plan
- plan 단계에서 scope, risk, worktree 필요 여부를 먼저 확정한다
- `build_allowed`라도 plan 없이 바로 코드 변경 금지
- ambiguity가 높으면 `needs_human_approval=true`
- dispatch 직전 preflight gate를 통과해야 한다:
  - repo allowlist 확인
  - active conflicting workspace/worktree 존재 여부 확인
  - review queue / reviewer availability 확인
  - branch/worktree 생성 가능 여부 확인
  - required secret/permission 존재 여부 확인

### 7-3. Build
- 코드/설정 변경은 worktree 정책을 따른다
- 문서-only는 main workspace 허용 가능
- build 단계 산출물은 evidence로 남겨야 한다

### 7-4. Review gate
- `workspace/docs/agenthive-core/agenthive-review-gate-v1.md`를 따른다
- 자동 작업이라도 `approved` 또는 적법한 `waived` 없이 merge/close 금지
- evidence 최소 요건: artifact path + summary + verification

### 7-5. PR / Comment / Report
- build_allowed 범위에서는 draft PR 생성 가능
- propose_only / plan_only 범위에서는 issue comment 또는 task summary로 종료
- 최종 보고에는 다음 중 하나가 명확해야 한다
  - PR opened
  - changes proposed only
  - blocked with reason
  - awaiting human approval

## 8. 실패 분류

| Failure class | 정의 | 기본 처리 |
|---|---|---|
| `retryable` | 네트워크, rate limit, 일시적 CI 실패 | 자동 재시도 |
| `environmental` | runner/worktree/GitHub API 일시 장애 | 제한 재시도 후 에스컬레이션 |
| `non_retryable` | 입력 오류, 권한 부족, 정책 위반, scope mismatch | 즉시 중단 + 인간 보고 |
| `blocked_external` | upstream patch, secret, maintainer action 필요 | blocked 보고 |

## 9. Retry / Backoff rule

retry 가능한 실패에만 자동 재시도한다.

기본 규칙:
- max retries: 3
- backoff: exponential
- jitter: 사용
- 같은 failure signature가 3회 반복되면 자동 중단

예시:
- 1차 재시도: 1x
- 2차 재시도: 2x + jitter
- 3차 재시도: 4x + jitter

재시도 금지 예시:
- permission denied
- policy violation
- missing secret
- invalid label / invalid repo target

## 10. Escalation rule

아래면 인간에게 즉시 에스컬레이션한다.
- high-risk issue
- medium-risk인데 repo rule 불명확
- non-retryable failure
- 3회 재시도 후 동일 오류 지속
- review gate에서 `blocked_review` 또는 `request_changes` 반복
- 외부 secret / maintainer / upstream 결정 필요
- worktree preflight가 실패해 경로 충돌 / 활성 isolated workspace / reviewer availability 부족 / required secret 부재가 확인됨

preflight failure 상태 규칙:
- 경로 충돌 또는 활성 isolated workspace 발견 -> `await_human` 또는 queue 보류
- reviewer availability 부족 -> `await_review_capacity`
- required secret/permission 부재 -> `blocked_external`
- worktree 생성 불가 + main workspace도 정책상 금지 -> `blocked_policy`

에스컬레이션 결과물:
- 무엇을 시도했는지
- 어떤 evidence가 있는지
- 왜 멈췄는지
- 사람이 다음에 결정해야 할 1개 액션

## 11. Human approval gate

다음 중 하나라도 참이면 human approval required:
- protected branch 관련 쓰기
- medium/high risk
- security/auth/billing/infra/data migration
- 자동 merge/close 시도
- waiver 필요
- repo allowlist 밖 target

human approval 이후에도 review gate 자체는 생략되지 않는다.

## 12. 최소 acceptance checklist

TASK-003 완료 판정 체크:
- [x] 자동 실행 가능 범위와 인간 승인 필요 범위 구분
- [x] label / priority / risk 기반 dispatch 규칙 포함
- [x] issue -> task -> plan -> build -> review -> PR/comment 루프 정의
- [x] failure 분류 정의
- [x] retry / backoff 규칙 정의
- [x] escalation 규칙 정의

## 13. 다음 연결점

이 문서는 이어서 아래 문서와 연결된다.
- TASK-004: dashboard detail / internal ops panel 분리안
- TASK-005: AgentHive core v1 전체 설계 요약

특히 dashboard에는 아래 read model이 필요하다.
- issue intake 상태
- autopilot mode (`propose_only`, `plan_only`, `build_allowed`)
- retry count / failure class
- approval pending 여부
