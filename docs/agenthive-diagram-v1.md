# AgentHive 다이어그램 v1

작성일: 2026-03-11
상태: 설명용 다이어그램 초안

## 1. 전체 구조

```mermaid
flowchart TD
    U[사용자 / Discord / 채널 요청] --> OC[OpenClaw\n오케스트레이팅 / 세션 / 크론]
    OC --> AH[AgentHive\n프로토콜 / 상태 / task / review / log]
    OC --> ACP[Claude Code / Codex / OpenCode\n세션스폰 / ACP / subagent]
    ACP --> AH
    AH --> DASH[AgentHive Dashboard\n사람용 가시화 UI]
    DASH --> U

    OC --> CRON[OpenClaw Cron\n주기 점검 / deep-work 루프]
    CRON --> AH
    CRON --> ACP
```

## 2. 역할 분리

```mermaid
flowchart LR
    subgraph Human Layer
      U1[사용자]
      D1[Dashboard]
    end

    subgraph Orchestration Layer
      O1[OpenClaw Main]
      O2[Cron Jobs]
      O3[지휘 스킬]
    end

    subgraph State Layer
      H1[AgentHive Hub]
      H2[project.yaml]
      H3[task.yaml / plan.md / summary.md]
      H4[reviews / decisions / logs]
    end

    subgraph Execution Layer
      A1[Claude Code]
      A2[Codex]
      A3[OpenCode]
      A4[기타 subagent]
    end

    U1 --> O1
    O1 --> O3
    O3 --> H1
    O3 --> A1
    O3 --> A2
    O3 --> A3
    O2 --> H1
    O2 --> A4
    A1 --> H1
    A2 --> H1
    A3 --> H1
    H1 --> D1
```

## 3. 프로젝트 단위 흐름

```mermaid
sequenceDiagram
    participant User as 사용자
    participant OpenClaw as OpenClaw
    participant Resolver as Project Resolver
    participant Hive as AgentHive Hub
    participant Agent as 실행 에이전트
    participant Dash as Dashboard

    User->>OpenClaw: 아무 채널/프로젝트에서 요청
    OpenClaw->>Resolver: 현재 path 기준 project resolve
    Resolver->>Hive: 해당 프로젝트 backlog/task 확인
    OpenClaw->>Agent: task 맥락 포함 위임
    Agent->>Hive: summary/review/log 반영
    Hive->>Dash: 상태 반영
    Dash->>User: 사람이 브라우저에서 확인
```

## 4. Work Group 구조

```mermaid
flowchart TB
    subgraph LevelUp[Project Level Up 그룹]
      L1[버그 검토]
      L2[보안 점검]
      L3[디자인/UX 점검]
      L4[기획 보강]
      L5[후속 task 생성]
    end

    subgraph SkillRole[Skill / Role Design 그룹]
      S1[역할 정의]
      S2[스킬 팩 설계]
      S3[에이전트 적합성 검토]
      S4[Kira화 검토]
    end

    subgraph Execution[업무 수행 그룹]
      E1[구현]
      E2[리팩터링]
      E3[테스트]
      E4[리뷰 반영]
    end

    LevelUp --> SkillRole
    SkillRole --> Execution
    Execution --> LevelUp
```

## 5. 크론 / Deep Work 루프

```mermaid
flowchart LR
    C1[Project Check Cron] --> H[AgentHive 상태 읽기]
    C2[Skill/Role Check Cron] --> H
    C3[Review/DeepWork Cron] --> H
    H --> J{후속 액션 필요?}
    J -- 아니오 --> R1[짧은 상태 보고]
    J -- 예 --> S[격리 세션 / agentTurn 생성]
    S --> A[에이전트 작업 수행]
    A --> H
    H --> D[Dashboard 반영]
```

## 6. 현재 해석

- OpenClaw는 **지휘자**다.
- AgentHive는 **기억/상태 저장소**다.
- Dashboard는 **사람의 관측 창**이다.
- 에이전트는 Dashboard가 아니라 AgentHive 파일을 보고 일한다.
