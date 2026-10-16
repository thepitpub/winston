import { expect, test } from '@playwright/test'
import { adm } from '../integracao/apoio'

/*
 * Fluxos reais no navegador. Usa o atalho de desenvolvimento (identidades
 * sintéticas) para entrar; o atalho só existe fora de produção.
 */

test.describe('portas', () => {
  test('sem sessão, Portal e Command mandam para as respectivas entradas', async ({ page }) => {
    await page.goto('/lobby')
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/admin/members')
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test('entrada responde igual para telefone que não é de membro (sem enumeração)', async ({ page }) => {
    await page.goto('/login')
    const tel = `61 9${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`
    await page.getByLabel('Telefone').fill(tel)
    await page.getByRole('button', { name: 'Receber código' }).click()
    await expect(page.getByText('Se o número for de um membro ativo')).toBeVisible()
    await page.getByLabel('Código de 6 dígitos').fill('000000')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByText('Código inválido ou expirado.')).toBeVisible()
  })

  test('convite inexistente mostra a porta fechada', async ({ page }) => {
    await page.goto('/invite/' + 'a'.repeat(43))
    await expect(page.getByRole('heading', { name: 'Esta porta está fechada.' })).toBeVisible()
  })
})

test.describe('membro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/entrar?como=membro')
    await expect(page).toHaveURL(/\/lobby$/)
  })

  test('Grand Lobby, credencial e Service Bell de ponta a ponta', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Demonstração')
    await page.goto('/credential')
    await expect(page.getByLabel('Credencial de membro')).toContainText(/CH-[A-Z0-9]{4}-[A-Z0-9]{4}/)

    const assunto = `E2E ${Date.now()}`
    await page.getByRole('button', { name: /Service Bell/ }).click()
    await page.getByLabel('Assunto').fill(assunto)
    await page.getByLabel('Mensagem').fill('Teste automatizado do Service Bell.')
    await page.getByRole('button', { name: 'Enviar à equipe' }).click()
    await page.getByRole('link', { name: 'Acompanhar a solicitação' }).click()
    await expect(page.getByRole('heading', { name: assunto })).toBeVisible()

    // limpeza
    await adm.from('concierge_requests').delete().eq('subject', assunto)
  })

  test('membro não entra no Command', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login\?e=sem_acesso$/)
  })

  test('Winston responde sem enviar nada sozinho', async ({ page }) => {
    await page.goto('/winston?c=nova&pergunta=' + encodeURIComponent('Qual é o meu saldo?'))
    await expect(page.getByLabel('Mensagem ao Winston')).toHaveValue('Qual é o meu saldo?')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page).toHaveURL(/\/winston\?c=[0-9a-f-]{36}$/, { timeout: 20_000 })
    await expect(page.getByText(/Seu saldo/).last()).toBeVisible({ timeout: 20_000 })
  })
})

test.describe('equipe', () => {
  test('Command lista os fundadores e esconde a Member Intelligence sem concessão explícita', async ({ page }) => {
    await page.goto('/dev/entrar?como=equipe')
    await expect(page).toHaveURL(/\/admin$/)
    // Sem nome real no teste: abre o primeiro fundador da lista, seja quem for.
    await page.goto('/admin/members?categoria=founder')
    const primeiro = page.locator('tbody a[href^="/admin/members/"]').first()
    const nome = (await primeiro.evaluate((el) => el.querySelector(':scope > span')?.firstChild?.textContent ?? '')).trim()
    expect(nome.length).toBeGreaterThan(1)
    await primeiro.click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(nome)
    await expect(page.getByRole('link', { name: 'Member Intelligence' })).toHaveCount(0)
    await page.goto(page.url().split('?')[0] + '?aba=inteligencia')
    await expect(page.getByText('Não há inteligência privada')).toHaveCount(0)
    await expect(page.getByText('Enriquecimento público (CS)')).toHaveCount(0)
  })
})
