# AgentHive State Diagram v1

작성일: 2026-03-11
상태: 운영 시각화 초안

## 1. Project 상태 다이어그램

```mermaid
stateDiagram-v2
    [*] --> discovered
    discovered --> registered
    registered --> active
    active --> deepwork
    active --> review_heavy
    active --> blocked
    active --> dormant
    deepwork --> active
    review_heavy --> active
    blocked --> active
    dormant --> active
    dormant --> archived
    archived --> [*]
```

## 2. Task 상태 다이어그램

```mermaid
stateDiagram-v2
    [*] --> backlog
    backlog --> ready
    ready --> doing
    doing --> review
    review --> done
    doing --> blocked
    review --> blocked
    blocked --> ready
    doing --> stale
    stale --> ready
    stale --> blocked
    done --> [*]
```

## 3. Dispatch 상태 다이어그램

```mermaid
stateDiagram-v2
    [*] --> queued
    queued --> claimed
    claimed --> workspace_prepared
    workspace_prepared --> running
    running --> waiting_review
    running --> waiting_human
    running --> retry
    running --> completed
    running --> failed
    retry --> queued
    waiting_review --> running
    waiting_review --> completed
    waiting_human --> queued
    completed --> [*]
    failed --> [*]
```

## 3-1. 변경형 작업 Review Gate

```mermaid
stateDiagram-v2
    [*] --> task_created
    task_created --> build_running
    build_running --> review_pending
    review_pending --> build_running
    review_pending --> approved
    approved --> done
    build_running --> blocked
    review_pending --> blocked
    blocked --> build_running
```

## 4. GitHub Issue Autopilot 상태 다이어그램

```mermaid
stateDiagram-v2
    [*] --> issue_detected
    issue_detected --> candidate_validated
    candidate_validated --> card_created
    candidate_validated --> waiting_human
    card_created --> plan_ready
    plan_ready --> workspace_prepared
    workspace_prepared --> build_running
    build_running --> review_pending
    review_pending --> build_running
    review_pending --> pr_ready
    review_pending --> waiting_human
    pr_ready --> pr_draft_created
    pr_ready --> waiting_human
    pr_draft_created --> synced
    waiting_human --> synced
    synced --> [*]
```

## 5. 운영 메모

- 이 상태도들은 Dashboard에 내부 운영 패널로 표시하면 좋다.
- Project / Task / Dispatch를 따로 보여주면 운영자가 병목을 더 쉽게 본다.
- 오토파일럿 레벨이 올라갈수록 Dispatch 상태 추적이 더 중요해진다.
- `workspace_prepared` 진입 기준은 `docs/agenthive-workspace-worktree-policy-v1.md`에서 정의한다.
- issue autopilot의 candidate filter, review gate, PR 진입 기준은 `docs/agenthive-github-issue-autopilot-rule-v1.md`에서 구체화한다.
