export const FIXTURES = {
  metaWebhookText: (wabaId, phone, messageId, text) => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: wabaId,
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550234567',
                phone_number_id: '10987654321'
              },
              contacts: [
                {
                  profile: { name: 'QA Test User' },
                  wa_id: phone.replace('+', '')
                }
              ],
              messages: [
                {
                  from: phone.replace('+', ''),
                  id: messageId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: text },
                  type: 'text'
                }
              ]
            }
          }
        ]
      }
    ]
  }),

  metaWebhookStatus: (wabaId, messageId, status, recipientId) => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: wabaId,
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550234567',
                phone_number_id: '10987654321'
              },
              statuses: [
                {
                  id: messageId,
                  status: status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: recipientId ? recipientId.replace('+', '') : '14155552671',
                  conversation: {
                    id: 'CONV_123',
                    origin: { type: 'user_initiated' }
                  },
                  pricing: {
                    billable: true,
                    pricing_model: 'CBP',
                    category: 'service'
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  }),

  malformedWebhook: {
    object: 'not_whatsapp',
    entry: []
  },

  sqlInjectionStrings: [
    "'; DROP TABLE public.campaigns; --",
    "' OR '1'='1",
    "admin' --",
    "1; SELECT pg_sleep(5);",
    "<script>alert('XSS')</script>"
  ]
};
