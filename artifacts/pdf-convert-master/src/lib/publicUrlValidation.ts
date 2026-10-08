// Early form feedback only. The server independently resolves and validates
// every destination and redirect before fetching; DNS cannot be checked here.
function publicIpv4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

function publicIpv6(ip: string): boolean {
  const [left, right] = ip.split("::");
  const l = left ? left.split(":") : [], r = right ? right.split(":") : [];
  const words = (right !== undefined ? [...l, ...Array(8 - l.length - r.length).fill("0"), ...r] : l).map(v => parseInt(v, 16));
  if (words.slice(0, 5).every(v => v === 0) && words[5] === 0xffff)
    return publicIpv4(`${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`);
  return (words[0] & 0xe000) === 0x2000 && words[0] !== 0x2002 &&
    !(words[0] === 0x2001 && (words[1] < 0x0200 || words[1] === 0xdb8)) &&
    !(words[0] === 0x3fff && (words[1] & 0xf000) === 0);
}

export function validatePublicUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Enter a web address.";
  if (value.length > 2048) return "Use a URL of no more than 2,048 characters.";
  let url: URL;
  try { url = new URL(value); } catch { return "That is not a valid URL. Include https:// at the start."; }
  if (!["http:", "https:"].includes(url.protocol)) return "Only http:// and https:// addresses are supported.";
  if (url.username || url.password) return "URLs with a username or password are not allowed.";
  if (url.port && !["80", "443"].includes(url.port)) return "Use standard web ports 80 or 443.";
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || /(^|\.)(localhost|local|internal|invalid|test|onion)$/.test(host) ||
    (!host.includes(".") && !host.includes(":")) ||
    (/^\d+\.\d+\.\d+\.\d+$/.test(host) && !publicIpv4(host)) ||
    (host.startsWith("[") && !publicIpv6(host.slice(1, -1))))
    return "Private, internal and reserved addresses are not allowed.";
  return null;
}
