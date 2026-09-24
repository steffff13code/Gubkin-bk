/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Данные меняются постоянно (задачи, стадии): при переходе всегда берём свежую страницу,
    // а не копию из клиентского кэша 30-секундной давности.
    staleTimes: { dynamic: 0, static: 30 }
  }
};

export default nextConfig;
