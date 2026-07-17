export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function requiredAnyEnv(names) {
  const found = names.find((name) => process.env[name]);
  if (!found) {
    throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
  }
  return process.env[found];
}

export function optionalEnv(name) {
  return process.env[name] || "";
}
