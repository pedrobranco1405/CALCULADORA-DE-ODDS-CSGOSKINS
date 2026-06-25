# CSGO-SKINS Odds Calculator

Extensao Chrome/Edge Manifest V3 para calcular, nas paginas de caixas do `csgo-skins.com`, a chance de:

- lucro: skin com preco maior que o preco da caixa;
- empate: skin com preco igual ao preco da caixa;
- perda: skin com preco menor que o preco da caixa.

Ela tambem mostra valor esperado, EV e retorno percentual. Antes de calcular, a extensao adiciona a classe `ContainerGroupedItem--show-chances` nos cards `.ContainerGroupedItem.item_item` para revelar as odds individuais.

## Como instalar em modo desenvolvedor

1. Abra `chrome://extensions` ou `edge://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em "Carregar sem compactacao".
4. Selecione esta pasta: `C:\Users\"User"\Desktop\CALCULADORA-DE-ODDS-CSGOSKINS-main`.
5. Abra uma pagina como `https://csgo-skins.com/case/low-case`.

## Observacoes

A extensao le as odds e precos que ja aparecem visualmente na pagina da caixa. Se o site mudar o formato do texto ou esconder a tabela, o parser pode precisar de ajuste.
