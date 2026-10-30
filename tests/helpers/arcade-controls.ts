import type { Page } from '@playwright/test'
export async function setRange(page: Page, name: RegExp, value: number) {
  await page.getByRole('slider', { name }).evaluate((el, value) => {
    const input = el as HTMLInputElement
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}
