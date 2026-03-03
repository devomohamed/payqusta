async function loginAs(api, credentials) {
  const response = await api
    .post('/api/v1/auth/login')
    .send(credentials);

  return {
    response,
    token: response.body && (response.body.token || response.body.accessToken || response.body?.data?.token),
    user: response.body && (response.body.user || response.body?.data?.user),
  };
}

module.exports = { loginAs };
