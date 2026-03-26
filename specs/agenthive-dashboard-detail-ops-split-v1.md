---
status: draft
last-verified: "2026-03-25"
---

# AgentHive Dashboard Detail / Internal Ops Panel Split v1

- 작성일: 2026-03-11
- 상태: Draft v1
- 범위: AgentHive Core TASK-004

## 1. 목적

이 문서는 AgentHive에서 사람이 보는 **public/core detail panel**과 운영자가 쓰는 **internal ops panel**을 분리한다.

핵심 목표:
- dashboard를 source of truth로 오해하지 않게 하기
- 사용자/기여자용 읽기 화면과 운영자용 제어 화면의 책임을 분리하기
- event / log / metric 노출 수준을 역할별로 분리하기

## 2. 기본 원칙

### 원칙 A. AgentHive가 source of truth다
- task
- plan
- summary
- review decision
- evidence
- log

위 항목의 원장은 AgentHive task/hub에 존재한다.
Dashboard는 이를 읽는 **read model**이다.

### 원칙 B. public/core detail panel은 읽기 중심이다
- 상태 이해
- 진행 상황 확인
- 핵심 evidence 확인
- 다음 액션 이해

직접 운영 제어를 하지 않는다.

### 원칙 C. internal ops panel은 운영 제어/진단 전용이다
- 재시도
- 차단 원인 확인
- dispatch 재평가
- queue health / worker health / policy 위반 진단

### 원칙 D. 같은 데이터라도 노출 수준은 다를 수 있다
- public에는 요약만
- internal에는 raw/diagnostic metadata 포함 가능

## 3. 두 패널의 역할 분리

| 영역 | Public/Core Detail Panel | Internal Ops Panel |
|---|---|---|
| 주 사용자 | OSS 사용자, 기여자, task follower | operator, maintainer, reviewer |
| 주 목적 | task/issue 상태 이해 | 운영 제어, 원인 분석, 복구 |
| 상호작용 수준 | 읽기 중심 | 제어/재시도/감사 중심 |
| source of truth 여부 | 아니오 | 아니오 |
| 데이터 수준 | 요약/설명/핵심 evidence | 진단/세부 log/dispatch metadata |

## 4. Public/Core Detail Panel 책임

public/core detail panel은 아래만 책임진다.
- 현재 상태 요약
- task/objective/acceptance 요약
- 최신 summary
- 현재 단계(plan/build/review/release 등)
- 핵심 evidence 링크
- reviewer decision 결과 요약
- 차단 여부와 사용자 친화적 설명
- 다음 권장 액션

public panel에 포함 가능한 예:
- task title
- short status label
- acceptance progress
- review gate status
- evidence summary + evidence checklist 상태
- latest decision summary / decision id reference
- linked issue / PR / document
- last synced / last updated

public panel에 넣지 않는 것:
- raw secret path/value
- 내부 retry counter 상세 튜닝값
- worker identity/debug traces 전체
- 운영자 전용 버튼/실행 액션
- 내부 정책 위반 상세 로그 원문

## 5. Internal Ops Panel 책임

internal ops panel은 아래를 책임진다.
- dispatch 상태 확인
- worker/worktree/sandbox 상태 확인
- retry / backoff / escalation 상태 확인
- blocked_review / blocked_external / blocked_policy 진단
- approval pending / reviewer capacity 상태 확인
- queue health / throughput / failure signature 관찰
- 운영자 전용 제어 액션

internal panel 예시 항목:
- autopilot mode
- risk tier / dispatch reason
- retry_count / failure_class
- active worker/session/worktree
- queue depth / pending review count
- recent errors / blocked reasons
- operator-only action permission boundary
- recovery action buttons (operator only)

## 6. Source of truth vs read model 경계

### Source of truth
- AgentHive task state
- review decision records
- evidence records
- issue/PR linkage metadata
- execution log / decision log

### Read model
- dashboard cards
- detail panel summary blocks
- KPI/metrics charts
- operator overview tables

규칙:
- dashboard에서 상태를 직접 수정하지 않는다.
- panel action은 source of truth에 명령을 보내고, 결과는 다시 읽어온다.
- dashboard 값과 원장이 다르면 원장이 우선이다.

## 7. Event / Log / Metric 노출 수준

### 7-1. Public/Core Detail Panel에 노출 가능한 것
- 상태 전이 요약 이벤트
- summary 로그
- approval / request_changes / blocked 여부
- 핵심 KPI 수준의 aggregate metric
- 사용자에게 의미 있는 실패 설명

### 7-2. Internal Ops Panel 전용
- raw event stream
- worker/session/worktree 식별자
- dispatch reason / policy decision detail
- retry/backoff timing
- failure signature / stack-like diagnostic context
- queue depth / scheduler health
- internal cooldown / escalation flags

### 7-3. 비노출 또는 마스킹 대상
- secrets / tokens / webhook URLs
- 민감한 파일 경로 원문
- 개인 식별 정보
- operator-only credential metadata

## 8. 액션 권한 분리

| 액션 | Public/Core Detail | Internal Ops |
|---|---:|---:|
| 상태 조회 | 가능 | 가능 |
| evidence 보기 | 가능(요약) | 가능(상세) |
| retry 실행 | 불가 | 가능 |
| dispatch 강제 변경 | 불가 | 가능 |
| waiver/block 해제 | 불가 | 가능 |
| worker kill/reassign | 불가 | 가능 |

## 9. 추천 정보 구조

### Public/Core Detail Panel
1. Header
2. Current status
3. Objective / acceptance
4. Latest summary
5. Key evidence
6. Decision result
7. Next action

### Internal Ops Panel
1. Health overview
2. Dispatch / mode / risk
3. Queue / worker state
4. Review gate diagnostics
5. Failure / retry / escalation
6. Operator actions
7. Audit trail

## 10. 연결 규칙

- review gate 결과는 public panel에는 verdict summary로, internal panel에는 decision/evidence detail로 노출한다.
- worktree policy 결과는 public panel에는 숨기고, internal panel에서만 execution surface 진단으로 본다.
- GitHub issue autopilot 상태는 public panel에 mode/result만, internal panel에는 dispatch reasoning까지 노출한다.

## 11. 최소 acceptance checklist

TASK-004 완료 판정 체크:
- [x] public/core detail panel vs internal ops panel 책임 분리
- [x] source of truth vs read model 경계 정의
- [x] event/log/metric 노출 수준 분리

## 12. 다음 연결점

이 문서는 `TASK-005: AgentHive core v1 전체 설계 요약`의 직접 입력이 된다.
그 문서에서는 아래를 하나로 묶어야 한다.
- review gate
- workspace/worktree policy
- GitHub issue autopilot
- dashboard detail / internal ops split
