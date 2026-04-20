import { Category, ParsedSMSTransaction } from '@/types'

// UPI/Bank SMS patterns
const UPI_PATTERNS = [
  // HDFC: "Rs.120.00 debited from A/c **1234 on 12-01-24 to VPA merchant@upi"
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)\s*(?:debited|deducted|paid|sent)/i,
  // SBI/ICICI: "Your a/c XXXX1234 debited by Rs 500"  
  /debited\s+(?:by\s+)?(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
  // PhonePe/GPay: "Paid Rs 250 to merchant"
  /(?:paid|sent|transferred)\s+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
  // Generic amount pattern
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
]

const DATE_PATTERNS = [
  /(\d{2}[-\/]\d{2}[-\/]\d{2,4})/,
  /(\d{2}\s+\w{3}\s+\d{2,4})/,
]

const TIME_PATTERNS = [
  /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i,
]

const MERCHANT_PATTERNS = [
  /(?:to|at|from)\s+(?:VPA\s+)?([A-Za-z0-9\s]+?)(?:\s+on|\s+Ref|$)/i,
  /UPI\/([^\/\s]+)/i,
]

// Category keywords
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  'Food & Drinks': ['swiggy', 'zomato', 'restaurant', 'cafe', 'dhaba', 'hotel', 'food', 'pizza', 'burger', 'biryani'],
  'Transport': ['uber', 'ola', 'rapido', 'auto', 'taxi', 'metro', 'bus', 'petrol', 'fuel', 'irctc', 'railway'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'mall', 'market', 'store'],
  'Entertainment': ['netflix', 'hotstar', 'spotify', 'youtube', 'pvr', 'inox', 'bookmyshow', 'movie'],
  'Utilities': ['electricity', 'water', 'gas', 'phone', 'mobile', 'recharge', 'internet', 'broadband', 'airtel', 'jio', 'vodafone'],
  'Health': ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine', 'chemist', 'apollo', 'practo'],
  'Snacks': ['chai', 'tea', 'coffee', 'biscuit', 'snack', 'chips', 'maggi', 'noodles', 'pani puri', 'vada pav'],
  'Lifestyle': ['salon', 'spa', 'gym', 'fitness', 'grooming', 'parlour'],
  'Essentials': ['grocery', 'bigbasket', 'blinkit', 'zepto', 'dunzo', 'vegetables', 'milk', 'dmart', 'reliance fresh'],
  'Uncategorized': [],
}

function guessCategory(text: string): Category {
  const lower = text.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category as Category
    }
  }
  return 'Uncategorized'
}

function parseAmount(text: string): number | null {
  for (const pattern of UPI_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const raw = match[1].replace(/,/g, '')
      const amount = parseFloat(raw)
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        return amount
      }
    }
  }
  return null
}

function parseDate(text: string): string {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      // Normalize to YYYY-MM-DD
      const raw = match[1]
      // Try to parse various formats
      const parts = raw.split(/[-\/\s]/)
      if (parts.length >= 3) {
        const day = parts[0].padStart(2, '0')
        const month = parts[1].padStart(2, '0')
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
        return `${year}-${month}-${day}`
      }
    }
  }
  // Default to today
  return new Date().toISOString().split('T')[0]
}

function parseTime(text: string): string | undefined {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return undefined
}

function parseMerchant(text: string): string | undefined {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern)
    if (match) return match[1].trim()
  }
  return undefined
}

export function parseSMSMessage(sms: string): ParsedSMSTransaction | null {
  // Only process debit/payment messages
  const isDebit = /debit|paid|sent|payment|transferred/i.test(sms)
  if (!isDebit) return null

  const amount = parseAmount(sms)
  if (!amount) return null

  const date = parseDate(sms)
  const time = parseTime(sms)
  const merchant = parseMerchant(sms)
  const category = guessCategory(sms + (merchant || ''))

  return {
    amount,
    merchant,
    date,
    time,
    category,
    raw_sms: sms,
  }
}

export function parseBulkSMS(messages: string[]): ParsedSMSTransaction[] {
  return messages
    .map(parseSMSMessage)
    .filter((t): t is ParsedSMSTransaction => t !== null)
}
