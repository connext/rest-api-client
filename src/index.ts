import { initApp } from "./app";

initApp().then(({ app, config }) => {
  const [host, port] = config.host.split(":");
  app.listen(+port, host, (err) => {
    if (err) throw err;
  });
});
