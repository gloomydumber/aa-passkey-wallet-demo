# AA Passkey Wallet

A web-based blockchain wallet combining **Account Abstraction (EIP-4337)** smart accounts with **Passkey (WebAuthn)** authentication.

[![CI](https://github.com/gloomydumber/aa-passkey-wallet-demo/actions/workflows/ci.yml/badge.svg)](https://github.com/gloomydumber/aa-passkey-wallet-demo/actions/workflows/ci.yml)

## Features

- **Passkey Authentication** - No passwords, use biometrics or security keys
- **Smart Account (EIP-4337)** - Coinbase Smart Wallet implementation
- **Gas Sponsorship** - Free deployment on testnets via Pimlico paymaster
- **Multi-Network** - Supports Ethereum Sepolia and Arbitrum Sepolia
- **On-Ramp Integration** - MoonPay integration for funding (sandbox mode)
- **Transaction History** - Local activity tracking with explorer links
- **Theme Support** - System, Light, and Dark modes

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/gloomydumber/aa-passkey-wallet-demo.git
cd aa-passkey-wallet-demo

# Install dependencies
npm install

# Copy environment file
cp apps/web/.env.example apps/web/.env.local
```

### Environment Variables

Edit `apps/web/.env.local`:

```env
# Required - Get free key at https://dashboard.pimlico.io
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key

# Optional - Custom RPC for better reliability
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://your-rpc-url
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=https://your-rpc-url

# Optional - MoonPay on-ramp (sandbox mode)
NEXT_PUBLIC_MOONPAY_API_KEY=your_moonpay_api_key
MOONPAY_SECRET_KEY=your_moonpay_secret_key
```

### Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Build all packages
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
aa-passkey-wallet-demo/
├── apps/
│   └── web/                 # Next.js web wallet
├── packages/
│   ├── core/                # Wallet engine (AA, chain, transactions)
│   ├── passkey/             # Credential storage & session management
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Shared utilities
├── .github/
│   └── workflows/           # GitHub Actions CI
└── package.json             # Monorepo root
```

## Tech Stack

| Category          | Technology              |
| ----------------- | ----------------------- |
| Framework         | Next.js 16 (App Router) |
| Language          | TypeScript              |
| Styling           | Tailwind CSS v4         |
| State             | Zustand                 |
| EVM               | viem                    |
| AA SDK            | permissionless          |
| Bundler/Paymaster | Pimlico                 |
| Smart Account     | Coinbase Smart Wallet   |
| Testing           | Vitest                  |
| CI/CD             | GitHub Actions          |

## Supported Networks

| Network          | Chain ID | Status  |
| ---------------- | -------- | ------- |
| Ethereum Sepolia | 11155111 | Testnet |
| Arbitrum Sepolia | 421614   | Testnet |

## User Flows

### New User

1. Register with passkey (biometric/security key)
2. View counterfactual smart account address
3. Fund wallet (MoonPay or receive ETH)
4. Deploy account (free with paymaster or pay gas)
5. Send transactions

### Returning User

1. Login with passkey
2. Access dashboard with balance
3. Send, Fund, or view Activity

## Scripts

| Command             | Description               |
| ------------------- | ------------------------- |
| `npm run dev`       | Start development server  |
| `npm run build`     | Build all packages        |
| `npm test`          | Run tests                 |
| `npm run lint`      | Lint code                 |
| `npm run format`    | Format code with Prettier |
| `npm run typecheck` | TypeScript type checking  |

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Pimlico](https://pimlico.io/) - Bundler and Paymaster infrastructure
- [Coinbase](https://github.com/coinbase/smart-wallet) - Smart Wallet implementation
- [viem](https://viem.sh/) - TypeScript Ethereum library
