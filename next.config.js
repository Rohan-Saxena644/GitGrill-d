/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'github.com',
            },
            {
                // Google account profile pictures (session.user.image for Google sign-in).
                // Missing this entry causes next/image to throw at render time for any
                // Google-authenticated session, which can break the whole app since
                // Navbar (which renders this image) is in the root layout.
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
        ],
    },
};

module.exports = nextConfig;
