// =====================================================================
//  Calculadora de custos de impressão 3D
//  Todos os valores de peça são POR UNIDADE; o total multiplica pela quantidade.
// =====================================================================

const n = (v) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}
const round2 = (v) => Math.round(v * 100) / 100

/**
 * Custo de uma peça.
 *  material      = peso(kg) × R$/kg × (1 + perda%)
 *  energia       = potência(kW) × horas × R$/kWh
 *  depreciação   = (preço da impressora ÷ vida útil em h) × horas
 *  manutenção    = R$/h de manutenção × horas
 *  falhas        = % de falhas aplicado sobre material + energia + máquina
 *  mão de obra   = (preparo + acabamento) × R$/h
 *  extras        = insumos adicionais (tinta, ímãs, parafusos, embalagem)
 */
export function calcItemCost(item, { printer, material, settings }) {
  const hours = n(item.print_hours)
  const weightKg = n(item.weight_g) / 1000
  const s = settings || {}

  const materialCost = weightKg * n(material?.price_per_kg) * (1 + n(s.material_waste) / 100)
  const energy = (n(printer?.power_watts) / 1000) * hours * n(s.energy_cost_kwh)
  const depreciation = n(printer?.lifespan_hours) > 0
    ? (n(printer?.purchase_price) / n(printer.lifespan_hours)) * hours
    : 0
  const maintenance = n(printer?.maintenance_cost_hour) * hours
  const machine = materialCost + energy + depreciation + maintenance
  const failure = machine * (n(s.failure_rate) / 100)
  const labor = (n(item.setup_hours) + n(item.post_hours)) * n(s.labor_cost_hour)
  const extras = n(item.extra_cost)

  const unitCost = machine + failure + labor + extras
  return {
    material: materialCost, energy, depreciation, maintenance,
    failure, labor, extras, unitCost,
  }
}

/** Fator que transforma custo em preço: aplica lucro e "embute" impostos e taxas. */
export function priceFactor({ margin, tax_rate, card_fee }) {
  const deductions = (n(tax_rate) + n(card_fee)) / 100
  const safe = Math.min(deductions, 0.95)
  return (1 + n(margin) / 100) / (1 - safe)
}

/** Calcula todas as peças e o resumo financeiro do orçamento. */
export function calcQuote(items, quote, { printers, materials, settings }) {
  const factor = priceFactor(quote)
  const lines = items.map((item) => {
    const printer = printers.find((p) => p.id === item.printer_id)
    const material = materials.find((m) => m.id === item.material_id)
    const breakdown = calcItemCost(item, { printer, material, settings })
    const qty = Math.max(1, Math.round(n(item.quantity) || 1))
    const unitPrice = round2(breakdown.unitCost * factor)
    return {
      breakdown,
      qty,
      unitCost: round2(breakdown.unitCost),
      totalCost: breakdown.unitCost * qty,
      unitPrice,
      totalPrice: round2(unitPrice * qty),
    }
  })

  const itemsCost = lines.reduce((a, l) => a + l.totalCost, 0)
  const itemsPrice = lines.reduce((a, l) => a + l.totalPrice, 0)
  const shipping = n(quote.shipping_cost)
  const discount = n(quote.discount)
  const total = round2(Math.max(0, itemsPrice - discount + shipping))
  const revenue = Math.max(0, total - shipping)
  const deductions = revenue * ((n(quote.tax_rate) + n(quote.card_fee)) / 100)
  const profit = revenue - deductions - itemsCost
  const realMargin = revenue > 0 ? profit / revenue : 0
  const totalHours = items.reduce((a, it, i) => a + n(it.print_hours) * lines[i].qty, 0)
  const totalGrams = items.reduce((a, it, i) => a + n(it.weight_g) * lines[i].qty, 0)

  return {
    lines, itemsCost: round2(itemsCost), itemsPrice: round2(itemsPrice),
    shipping, discount, total, deductions: round2(deductions),
    profit: round2(profit), realMargin, totalHours, totalGrams,
  }
}

export const COST_LABELS = {
  material: 'Material (com perda)',
  energy: 'Energia elétrica',
  depreciation: 'Depreciação da impressora',
  maintenance: 'Manutenção',
  failure: 'Reserva para falhas',
  labor: 'Mão de obra',
  extras: 'Insumos extras',
}
