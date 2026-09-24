const safeCompare = async (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const encoder = new TextEncoder();
  const aEncoded = encoder.encode(a);
  const bEncoded = encoder.encode(b);
  if (aEncoded.length !== bEncoded.length) return false;
  return await crypto.subtle.timingSafeEqual(aEncoded, bEncoded);
};

export const validateApiToken = async (request, apiToken) => {
  try {
    if (!request?.headers?.get) {
      console.error("Invalid request object");
      return false;
    }

    if (!apiToken) {
      console.error(
        "No API token provided. Set one as an environment variable.",
      );
      return false;
    }

    const authHeader = request.headers.get("authorization");
    const customTokenHeader = request.headers.get("x-api-token");

    let tokenToValidate = customTokenHeader;

    if (authHeader) {
      if (authHeader.startsWith("Bearer ")) {
        tokenToValidate = authHeader.substring(7);
      } else if (authHeader.startsWith("Token ")) {
        tokenToValidate = authHeader.substring(6);
      } else {
        tokenToValidate = authHeader;
      }
    }

    if (!tokenToValidate || tokenToValidate.length === 0) return false;

    return await safeCompare(apiToken.trim(), tokenToValidate.trim());
  } catch (error) {
    console.error("Error validating API token:", error);
    return false;
  }
};

export const getCustomers = async (baseUrl, apiToken) => {
  const url = `${baseUrl}/api/customers`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    return {
      customers: data.customers,
      success: true,
    };
  } else {
    console.error("Failed to fetch customers");
    return {
      customers: [],
      success: false,
    };
  }
};

export const getCustomer = async (id, baseUrl, apiToken) => {
  const response = await fetch(baseUrl + "/api/customers/" + id, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    return {
      customer: data.customer,
      success: true,
    };
  } else {
    console.error("Failed to fetch customers");
    return {
      customer: null,
      success: false,
    };
  }
};

// Changed for the BuildBase example: the admin UI's own calls send no token.
// The browser's BuildBase session cookie goes with them, and the middleware
// checks it. Upstream passed API_TOKEN to the browser for these three.
export const createCustomer = async (baseUrl, customer) => {
  const response = await fetch(baseUrl + "/api/customers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(customer),
  });
  if (response.ok) {
    const data = await response.json();
    return {
      customer: data.customer,
      success: true,
    };
  } else {
    console.error("Failed to create customer");
    return {
      customer: null,
      success: false,
    };
  }
};

export const createSubscription = async (baseUrl, subscription) => {
  const response = await fetch(baseUrl + "/api/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscription),
  });
  if (response.ok) {
    const data = await response.json();
    return {
      subscription: data.subscription,
      success: true,
    };
  } else {
    console.error("Failed to create subscription");
    return {
      subscription: null,
      success: false,
    };
  }
};

export const getSubscriptions = async (baseUrl, apiToken) => {
  const response = await fetch(baseUrl + "/api/subscriptions", {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    return {
      subscriptions: data.subscriptions,
      success: true,
    };
  } else {
    console.error("Failed to fetch subscriptions");
    return {
      subscriptions: [],
      success: false,
    };
  }
};

export const getSubscription = async (id, baseUrl, apiToken) => {
  const response = await fetch(baseUrl + "/api/subscriptions/" + id, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    return {
      subscription: data.subscription,
      success: true,
    };
  } else {
    console.error("Failed to fetch subscription");
    return {
      subscription: null,
      success: false,
    };
  }
};

export const getCustomerSubscriptions = async (baseUrl, apiToken) => {
  const response = await fetch(baseUrl + "/api/customer_subscriptions", {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    return {
      customer_subscriptions: data.customer_subscriptions,
      success: true,
    };
  } else {
    console.error("Failed to fetch customer subscriptions");
    return {
      customer_subscriptions: [],
      success: false,
    };
  }
};

export const runCustomerWorkflow = async (id, baseUrl) => {
  const response = await fetch(baseUrl + `/api/customers/${id}/workflow`, {
    method: "POST",
  });
  if (response.ok) {
    const data = await response.json();
    return {
      success: true,
    };
  } else {
    console.error("Failed to fetch customer subscriptions");
    return {
      success: false,
    };
  }
};
