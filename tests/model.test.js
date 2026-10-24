import test from "node:test";
import assert from "node:assert/strict";
import {
  countdown,
  initialState,
  totals,
  validateState,
  expenseStatus,
  escape,
  WEDDING_TIME,
} from "../src/model.js";

test("contagem usa meia-noite de Brasília e respeita a virada de dia", () => {
  assert.equal(WEDDING_TIME, "2027-07-24T00:00:00-03:00");
  assert.deepEqual(countdown(Date.parse("2027-07-23T00:00:00-03:00")), {
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
    arrived: false,
  });
  assert.deepEqual(countdown(Date.parse("2027-07-24T02:59:59Z")), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 1,
    arrived: false,
  });
});

test("contagem nunca fica negativa e sinaliza a chegada da data", () => {
  for (const date of ["2027-07-24T03:00:00Z", "2028-01-01T00:00:00Z"]) {
    assert.deepEqual(countdown(Date.parse(date)), {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      arrived: true,
    });
  }
});

test("resumo soma despesas e acompanhantes de acordo com as confirmações", () => {
  const state = initialState();
  const summary = totals(state);
  assert.equal(summary.contracted, 36750);
  assert.equal(summary.paid, 14900);
  assert.equal(summary.remaining, 21850);
  assert.equal(summary.available, 8250);
  assert.equal(summary.invited, 19);
  assert.equal(summary.confirmed, 10);
  assert.equal(summary.completed, 3);
  assert.equal(summary.progress, 38);
  assert.equal(summary.budgetPercent, 82);
});

test("cálculos financeiros usam centavos para evitar falsos estouros de orçamento", () => {
  const state = initialState(true);
  state.settings.budget = 0.3;
  state.expenses = [
    { amount: 0.1, paid: 0.1 },
    { amount: 0.2, paid: 0.1 },
  ];
  const summary = totals(state);
  assert.equal(summary.contracted, 0.3);
  assert.equal(summary.available, 0);
  assert.equal(summary.remaining, 0.1);
});

test("listas vazias e orçamento zero produzem totais finitos", () => {
  const state = initialState(true);
  state.settings.budget = 0;
  const summary = totals(state);
  assert.equal(summary.progress, 0);
  assert.equal(summary.budgetPercent, 0);
  assert.equal(summary.confirmed, 0);
  assert.ok(Object.values(summary).every(Number.isFinite));
});

test("saldo negativo informa orçamento excedido", () => {
  const state = initialState();
  state.settings.budget = 10000;
  assert.equal(totals(state).available, -26750);
});

test("status de pagamento acompanha valores totais e parciais", () => {
  assert.equal(expenseStatus({ amount: 500, paid: 0 }), "Pendente");
  assert.equal(expenseStatus({ amount: 500, paid: 200 }), "Parcial");
  assert.equal(expenseStatus({ amount: 500, paid: 500 }), "Pago");
});

test("backup válido preserva os registros e remove propriedades desconhecidas", () => {
  const state = initialState();
  state.untrusted = "descartar";
  state.settings.weddingDate = "2050-01-01";
  const result = validateState(JSON.parse(JSON.stringify(state)));
  assert.equal(result.untrusted, undefined);
  assert.equal(result.settings.weddingDate, "2027-07-24");
  assert.deepEqual(result.expenses, state.expenses);
  assert.notEqual(result.expenses, state.expenses);
  assert.deepEqual(validateState(initialState(true)), initialState(true));
});

test("importação rejeita valores negativos, não finitos ou pagamento maior que o total", () => {
  for (const [field, value] of [
    ["amount", -1],
    ["amount", Infinity],
    ["paid", 12001],
    ["paid", "100"],
  ]) {
    const state = initialState();
    state.expenses[0][field] = value;
    assert.throws(() => validateState(state));
  }
});

test("importação rejeita datas impossíveis, IDs repetidos e versões desconhecidas", () => {
  const invalidDate = initialState();
  invalidDate.tasks[0].dueDate = "2027-02-30";
  assert.throws(() => validateState(invalidDate), /Data inválida/);
  const duplicatedId = initialState();
  duplicatedId.guests[0].id = duplicatedId.expenses[0].id;
  assert.throws(() => validateState(duplicatedId), /identificadores repetidos/);
  assert.throws(
    () => validateState({ ...initialState(), version: 2 }),
    /Backup incompatível/,
  );
});

test("importação rejeita registros incompletos e acompanhantes fracionários", () => {
  const state = initialState();
  state.guests[0].companions = 1.5;
  assert.throws(() => validateState(state), /Acompanhantes/);
  state.guests[0].companions = 1;
  state.guests[0].name = "  ";
  assert.throws(() => validateState(state), /Nome/);
  assert.throws(() => validateState({ version: 1, demo: false, settings: {} }));
});

test("texto de usuário é escapado antes de ser inserido no HTML", () => {
  assert.equal(
    escape("<img src=x onerror=\"alert(1)\"> & 'oi'"),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;oi&#39;",
  );
});
