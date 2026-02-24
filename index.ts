export interface VercelConfig {
  baseUrl: string;
  bearerToken: string;
  projectId: string;
  baseDomain: string;
}

export interface DomainAdditionResult {
  success: boolean;
  domain?: string;
  error?: string;
}

export interface DomainRemovalResult {
  success: boolean;
  error?: string;
}

interface RecommendedRecord {
  rank: number;
  value: string | string[];
}

export interface DomainConfigResult {
  success: boolean;
  configuredBy?: "CNAME" | "A" | "http" | "dns-01" | null;
  nameservers?: string[];
  serviceType?: "external" | "zeit.world" | "na";
  cnames?: string[];
  aValues?: string[];
  conflicts?: string[];
  acceptedChallenges?: ("dns-01" | "http-01")[];
  recommendedIPv4?: RecommendedRecord[];
  recommendedCNAME?: RecommendedRecord[];
  ipStatus?: string | null;
  misconfigured?: boolean;
  error?: string;
}

interface VercelResponse {
  name?: string;
  configuredBy?: DomainConfigResult["configuredBy"];
  nameservers?: string[];
  serviceType?: DomainConfigResult["serviceType"];
  cnames?: string[];
  aValues?: string[];
  conflicts?: string[];
  acceptedChallenges?: ("dns-01" | "http-01")[];
  recommendedIPv4?: RecommendedRecord[];
  recommendedCNAME?: RecommendedRecord[];
  ipStatus?: string | null;
  misconfigured?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
  [key: string]: unknown;
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  allowStatuses?: number[];
}

export function createVercelClient(config: VercelConfig) {
  const { baseUrl, bearerToken, projectId, baseDomain } = config;

  function missingConfigError(keys: string[]): string | null {
    const missing = keys.filter((key) => {
      switch (key) {
        case "bearerToken":
          return !bearerToken;
        case "projectId":
          return !projectId;
        case "baseDomain":
          return !baseDomain;
        default:
          return false;
      }
    });

    return missing.length > 0
      ? `Vercel configuration is incomplete: missing ${missing.join(", ")}`
      : null;
  }

  async function request(
    path: string,
    options: RequestOptions = {}
  ): Promise<VercelResponse> {
    const { method = "GET", body, allowStatuses = [] } = options;

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const raw = await response.text();
    const responseData = raw ? (JSON.parse(raw) as VercelResponse) : {};

    if (!response.ok && !allowStatuses.includes(response.status)) {
      throw new Error(
        `Vercel API error: ${response.status} - ${JSON.stringify(responseData)}`
      );
    }

    return responseData;
  }

  async function addSubdomain(
    subdomain: string
  ): Promise<DomainAdditionResult> {
    const configError = missingConfigError([
      "baseDomain",
      "projectId",
      "bearerToken",
    ]);
    if (configError) {
      return { success: false, error: configError };
    }

    const fullDomain = `${subdomain}.${baseDomain}`;

    try {
      const responseData = await request(`/v10/projects/${projectId}/domains`, {
        method: "POST",
        body: { name: fullDomain },
      });

      return {
        success: true,
        domain: typeof responseData.name === "string" ? responseData.name : fullDomain,
      };
    } catch (error) {
      return {
        success: false,
        domain: fullDomain,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async function removeSubdomain(
    subdomain: string
  ): Promise<DomainRemovalResult> {
    const configError = missingConfigError([
      "baseDomain",
      "projectId",
      "bearerToken",
    ]);
    if (configError) {
      return { success: false, error: configError };
    }

    const fullDomain = `${subdomain}.${baseDomain}`;

    try {
      await request(`/v9/projects/${projectId}/domains/${fullDomain}`, {
        method: "DELETE",
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async function addCustomDomain(
    domain: string
  ): Promise<DomainAdditionResult> {
    const configError = missingConfigError(["projectId", "bearerToken"]);
    if (configError) {
      return { success: false, error: configError };
    }

    try {
      const responseData = await request(`/v10/projects/${projectId}/domains`, {
        method: "POST",
        body: { name: domain },
      });

      return {
        success: true,
        domain: typeof responseData.name === "string" ? responseData.name : domain,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes('"code":"domain_already_in_use"')) {
        return {
          success: false,
          domain,
          error: "This domain is already in use by another Vercel project",
        };
      }

      return {
        success: false,
        domain,
        error: errorMessage,
      };
    }
  }

  async function removeCustomDomain(
    domain: string
  ): Promise<DomainRemovalResult> {
    const configError = missingConfigError(["projectId", "bearerToken"]);
    if (configError) {
      return { success: false, error: configError };
    }

    try {
      await request(`/v9/projects/${projectId}/domains/${domain}`, {
        method: "DELETE",
        allowStatuses: [404],
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async function getDomainConfig(domain: string): Promise<DomainConfigResult> {
    const configError = missingConfigError(["bearerToken"]);
    if (configError) {
      return { success: false, error: configError };
    }

    try {
      const responseData = await request(`/v6/domains/${domain}/config`, {
        method: "GET",
      });

      const result: DomainConfigResult = {
        success: true,
      };

      if (responseData.configuredBy !== undefined) {
        result.configuredBy = responseData.configuredBy;
      }
      if (responseData.nameservers !== undefined) {
        result.nameservers = responseData.nameservers;
      }
      if (responseData.serviceType !== undefined) {
        result.serviceType = responseData.serviceType;
      }
      if (responseData.cnames !== undefined) {
        result.cnames = responseData.cnames;
      }
      if (responseData.aValues !== undefined) {
        result.aValues = responseData.aValues;
      }
      if (responseData.conflicts !== undefined) {
        result.conflicts = responseData.conflicts;
      }
      if (responseData.acceptedChallenges !== undefined) {
        result.acceptedChallenges = responseData.acceptedChallenges;
      }
      if (responseData.recommendedIPv4 !== undefined) {
        result.recommendedIPv4 = responseData.recommendedIPv4;
      }
      if (responseData.recommendedCNAME !== undefined) {
        result.recommendedCNAME = responseData.recommendedCNAME;
      }
      if (responseData.ipStatus !== undefined) {
        result.ipStatus = responseData.ipStatus;
      }
      if (responseData.misconfigured !== undefined) {
        result.misconfigured = responseData.misconfigured;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  return {
    addSubdomain,
    removeSubdomain,
    addCustomDomain,
    removeCustomDomain,
    getDomainConfig,
  };
}
