module.exports=asynce function (context, req) {
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json"},
    body: {
      ok: true,
      service: "DJUS-Forecast-Ladders API",
      timestamp: new Date().toISOString()
    }
  };
};
