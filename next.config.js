import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbo: {
    root: path.dirname(new URL(import.meta.url).pathname),
  },
};

export default nextConfig;
