/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  transpilePackages: ["@reclaim/database", "@reclaim/integrations", "@reclaim/queue", "@reclaim/recurrence", "@reclaim/config"]
};

export default nextConfig;
