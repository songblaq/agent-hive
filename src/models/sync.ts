/**
 * GitHub Sync — Bidirectional issue/PR synchronization
 */

export interface SyncConfig {
  version: string;
  enabled: boolean;
  repo: string;
  auth: string;
  sync_mode: "bidirectional" | "import-only" | "export-only";
  import: {
    issues: {
      enabled: boolean;
      filter: {
        labels: string[];
        exclude_labels: string[];
        state: "open" | "closed" | "all";
      };
      auto_status: string;
    };
    pull_requests: {
      enabled: boolean;
      link_to_tasks: boolean;
    };
  };
  export: {
    labels: {
      enabled: boolean;
      prefix: string;
    };
    comments: {
      enabled: boolean;
      on_status_change: boolean;
    };
  };
}

export interface IssueMapping {
  issue_number: number;
  task_id: string;
  repo: string;
  issue_url: string;
  issue_title: string;
  synced_at: string;
  direction: "import" | "export" | "both";
}

export interface PRMapping {
  pr_number: number;
  task_id: string;
  branch: string;
  status: "open" | "closed" | "merged";
  synced_at: string;
}

export interface SyncState {
  config: SyncConfig;
  issue_mappings: IssueMapping[];
  pr_mappings: PRMapping[];
  last_sync: string | null;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  version: "1.0",
  enabled: true,
  repo: "",
  auth: "gh-cli",
  sync_mode: "import-only",
  import: {
    issues: {
      enabled: true,
      filter: {
        labels: [],
        exclude_labels: ["wontfix", "question"],
        state: "open",
      },
      auto_status: "backlog",
    },
    pull_requests: {
      enabled: true,
      link_to_tasks: true,
    },
  },
  export: {
    labels: { enabled: false, prefix: "hive:" },
    comments: { enabled: false, on_status_change: false },
  },
};
