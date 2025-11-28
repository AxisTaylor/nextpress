import { NextResponse } from 'next/server';

export const cookieOptions = {
  maxAge: 30 * 24 * 60 * 60,
  secure: true,
  httpOnly: true,
  sameSite: 'strict' as 'strict',
}

export async function startSession(): Promise<string> {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      query: `query {
        customer {
          id
          sessionToken
        }
      }`,
    }),
    cache: 'no-store',
  });

  const { data } = await response.json();
  const sessionToken: string = data?.customer?.sessionToken;

  return sessionToken;
}

export function time() {
  return Math.floor(Date.now() / 1000);
}

export async function renewTokenIfExpired(authToken?: string, refreshToken?: string, expirationTime?: string): Promise<string|undefined> {
  

  // If there is no refresh token or expiration time, return the current token
  if (!refreshToken || !expirationTime) {
    return authToken;
  }

  // If the token is not expired, return the current token
  if (time() < parseInt(expirationTime)) {
    return authToken;
  }

  // If the token is expired, renew the token
  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      query: `mutation ($input: RefreshJwtAuthTokenInput!) {
        refreshJwtAuthToken(input: $input) {
          authToken
        }
      }`,
      variables: { input: { jwtRefreshToken: refreshToken } },
    }),
    cache: 'no-store',
  });

  const { data } = await response.json();
  const newAuthToken: string = data?.refreshJwtAuthToken?.authToken;

  return newAuthToken;
}

export async function getTokens(res: NextResponse): Promise<{ sessionToken: string, authToken?: string }> {
  let sessionToken = res.cookies.get('sessionToken')?.value;
  if (!sessionToken) {
    sessionToken = await startSession();
    res.cookies.set({
      name: 'sessionToken',
      value: sessionToken,
      ...cookieOptions,
    });
  }
  let authToken = res.cookies.get('authToken')?.value;
  if (authToken) {
    const refreshToken = res.cookies.get('refreshToken')?.value;
    const expirationTime = res.cookies.get('authTokenExp')?.value;
    authToken = await renewTokenIfExpired(authToken, refreshToken, expirationTime);

    authToken && res.cookies.set({
      name: 'authToken',
      value: authToken,
      ...cookieOptions,
    });
  
    authToken && res.cookies.set({
      name: 'authTokenExp',
      value: (time() + 3600).toString(),
      ...cookieOptions,
    });
  }

  return { sessionToken, authToken };
}