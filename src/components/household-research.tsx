import { usePlanning } from "../app/context.tsx";
import {
  HOUSEHOLD_RESEARCH,
  HOUSEHOLD_RESEARCH_DATE,
  researchPrice,
  researchTotal,
} from "../data/household-prices.ts";
import { applyHouseholdResearch } from "../domain/household-research.ts";
import { money, formatDate } from "../domain/planning.ts";
import { ActionButton, Icon } from "./ui.tsx";

export function HouseholdResearch() {
  const { update } = usePlanning();
  return (
    <details className="card house-price-research">
      <summary>
        <span>
          Pesquisa de preços · {formatDate(HOUSEHOLD_RESEARCH_DATE, true)}
        </span>
        <strong>{money(researchTotal())}</strong>
        <Icon name="down" />
      </summary>
      <div className="house-research-content">
        <p>
          Lista completa: 16 grupos, 21 unidades, incluindo 4 cortinas e 3
          luminárias. Referências para 220 V ou bivolt. A soma acima considera
          tudo por comprar; o resumo da casa desconta o que vocês já têm e
          respeita valores editados.
        </p>
        <p>
          Média de 2–3 ofertas comparáveis por grupo, arredondada para cima em
          R$ 10 por unidade. Alguns anúncios foram consultados pelo índice de
          busca. Preços podem mudar; Pix e cartão podem ter valores diferentes.
          Fretes, trilhos/varões, instalações e adequações não estão incluídos.
        </p>
        <div
          className="table-scroll"
          role="region"
          aria-label="Totais e fontes da pesquisa de preços"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd.</th>
                <th>Por unidade</th>
                <th>Total</th>
                <th>Fontes e critérios</th>
              </tr>
            </thead>
            <tbody>
              {HOUSEHOLD_RESEARCH.map((item) => {
                const price = researchPrice(item);
                return (
                  <tr key={item.key}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>Média da amostra: {money(price.mean)}</small>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{money(price.unit)}</td>
                    <td>
                      <strong>{money(price.unit * item.quantity)}</strong>
                    </td>
                    <td>
                      <details>
                        <summary>Ver referências</summary>
                        <p>{item.reference}</p>
                        <p>{item.notes}</p>
                        <ul>
                          {item.offers.map((source, index) => (
                            <li key={index}>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {source.store} · {source.model}
                              </a>
                              <strong>{money(source.amount)}</strong>
                              <small>{source.condition}</small>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3}>Total da lista pesquisada</th>
                <td>
                  <strong>{money(researchTotal())}</strong>
                </td>
                <td>Fretes e instalações à parte</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <ActionButton
          action={() =>
            update(
              (current) => applyHouseholdResearch(current, true),
              "Itens ausentes adicionados. Seus cadastros e preços próprios foram mantidos.",
            )
          }
        >
          Adicionar itens ausentes desta pesquisa
        </ActionButton>
        <small>
          Cadastros na lixeira continuam lá. Preços próprios e quantidades
          recebidas são preservados; estimativas zeradas recebem a referência
          pesquisada.
        </small>
      </div>
    </details>
  );
}
