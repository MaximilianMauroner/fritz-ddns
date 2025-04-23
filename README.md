# fritz-ddns

This project is a TypeScript/Next.js-based fork of [1rfsNet/Fritz-Box-Cloudflare-DynDNS](https://github.com/1rfsNet/Fritz-Box-Cloudflare-DynDNS), originally written in PHP. It provides a dynamic DNS update endpoint for use with AVM Fritz!Box routers, updating Cloudflare DNS records with your current public IP address.

## Features

- Updates Cloudflare DNS records (A) for a specified domain.
- Secured with a token to prevent unauthorized updates.
- Supports logging and proxying options.
- Configuration via environment variables.

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A Cloudflare account with API credentials
- A Fritz!Box router (or any device capable of making DynDNS requests)

### Installation

1. Clone this repository:
   ```sh
   git clone https://github.com/yourusername/fritz-ddns.git
   cd fritz-ddns
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Copy the example environment file and fill in your credentials:
   ```sh
   cp .env.example .env
   # Edit .env with your Cloudflare email, API key, and a secure token
   ```

### Configuration

Edit `.env`:

```
CLOUDFLARE_EMAIL="your cloudflare email"
CLOUDFLARE_API_KEY="your cloudflare api key"
CLOUDFLARE_TOKEN="your chosen token"
```

- `CLOUDFLARE_EMAIL`: Your Cloudflare account email.
- `CLOUDFLARE_API_KEY`: Your Cloudflare API key (Global or restricted for DNS).
- `CLOUDFLARE_TOKEN`: A secret token you set and use in update requests (also set this in your Fritz!Box DynDNS settings).

### Usage

Start the development server:

```sh
npm run dev
```

The update endpoint is available at:  
`GET /api/route` (or `/route` depending on deployment)

#### Example Request

```
https://your-server/route?cf_key=YOUR_TOKEN&domain=example.com&ipv4=1.2.3.4&log=true&proxy=false
```

- `cf_key`: Must match `CLOUDFLARE_TOKEN` in your `.env`.
- `domain`: The DNS record to update.
- `ipv4`: The new IPv4 address.
- `log`: (optional) Set to `true` to enable logging.
- `proxy`: (optional) Set to `true` to enable Cloudflare proxying.

### Fritz!Box Setup

In your Fritz!Box DynDNS settings, use the following:

- **Provider**: User-defined
- **Update-URL**:  
  ```
  https://your-server/route?cf_key=YOUR_TOKEN&domain=<domain>&ipv4=<ipaddr>
  ```
- Replace `<domain>` and `<ipaddr>` with Fritz!Box placeholders.

## License

GPL-3.0

## Credits

- Forked from [1rfsNet/Fritz-Box-Cloudflare-DynDNS](https://github.com/1rfsNet/Fritz-Box-Cloudflare-DynDNS)
