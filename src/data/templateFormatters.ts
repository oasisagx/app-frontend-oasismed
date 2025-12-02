import type { HistoryItem } from '../pages/Transcricao';

export const templateContents: Record<string, Record<string, (historyItem: HistoryItem) => string>> = {
  anamnese: {
    '1': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># ANAMNESE
## Identificação
• Nome: ${name}
• Data de nascimento/Idade:
• Gênero:
• Estado civil:
• Profissão:
• Data da consulta: ${date}
## Queixa Principal
Dor de cabeça há três dias.
## História da Doença Atual
Paciente refere dor de cabeça com três dias de evolução, localizada principalmente na região frontal
(testa), com irradiação ocasional para as têmporas. Caracteriza a dor como constante, de caráter
pulsátil, descrevendo sensação de pulsação acompanhando os batimentos cardíacos, com momentos
de piora.
Identifica fotofobia importante como fator de piora, relatando desconforto significativo em
ambientes com iluminação intensa e ao olhar para tela de celular, tendo evitado sair de casa durante
o dia devido a esse sintoma. Nega sintomas sistêmicos associados como febre, náuseas ou vômitos.
Nega sintomas respiratórios como resfriado recente ou obstrução nasal.
Realizou automedicação com paracetamol no dia anterior à consulta, sem melhora significativa do
quadro.
## Interrogatório Sistemático
Sintomas Gerais: Nega febre.
Sistema Digestório: Nega náuseas e vômitos.
Sistema Respiratório: Nega sintomas de resfriado. Nega obstrução nasal.
## Antecedentes Pessoais Patológicos
• Doenças prévias:
• Cirurgias:
• Internações:
• Alergias:
• Transfusões:
## Medicamentos em Uso
Paracetamol (uso ocasional por automedicação - utilizado no dia anterior sem melhora significativa)
## Antecedentes Familiares
## História Social e Hábitos de Vida
• Tabagismo:
• Etilismo:
• Atividade física:
• Sono: Padrão de sono inadequado, dormindo aproximadamente 5 a 6 horas por noite quando
consegue.
• Alimentação:
• Ocupação/Trabalho: Refere que o trabalho está "bem corrido", com estresse ocupacional
aparente.
• Moradia:
## Exame Físico Realizado
Sinais Vitais:
• Pressão arterial: 120/80 mmHg
Inspeção Geral:
• Estado geral preservado, paciente corado e hidratado.
Exame Neurológico:
• Movimentação ocular extrínseca: seguimento ocular preservado (seguiu objeto com os olhos
sem movimentar a cabeça) - exame normal
• Exame neurológico geral: sem alterações
Palpação:
• Sensibilidade dolorosa à palpação de pontos na região cefálica
• Sensibilidade dolorosa à palpação na região cervical
• Presença de tensão muscular evidente em região cervical e de ombros
## Exames Complementares Realizados
## Hipótese Diagnóstica
Cefaleia tensional, relacionada a estresse, má postura, tensão muscular e privação de sono.
## Conduta
Prescrição Medicamentosa:
• Naproxeno 500mg: tomar 1 comprimido imediatamente e repetir após 12 horas se a dor
persistir.
Orientações Não Farmacológicas:
• Repouso adequado (fundamental para recuperação)
• Aumentar tempo de sono para pelo menos 8 horas por noite nos próximos dias
• Afastamento laboral: se possível, tirar pelo menos 2 dias para descansar
• Reduzir tempo de exposição a telas (computador e celular)
• Manter ambientes com iluminação reduzida devido à fotofobia
• Realizar alongamentos cervicais e de ombros: girar a cabeça devagar para um lado, manter
por 5 segundos, depois para o outro lado (exercício demonstrado durante a consulta)
## Retorno/Seguimento:
• Retornar imediatamente se não houver melhora completa em 3 dias
• Retornar imediatamente se surgirem sinais de alerta: febre, vômitos ou piora importante da
dor
## Observações Adicionais
Durante o exame físico, o médico observou que a aplicação de luz durante a avaliação ocular
causou incômodo ao paciente, sendo necessário informar que seria breve devido à fotofobia
presente. O paciente demonstrou boa compreensão das orientações fornecidas. O médico enfatizou
de forma especial que o repouso é fundamental para a recuperação do quadro.`;
    },
    '2': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># ANAMNESE
## Identificação
• Nome: ${name}
• Data de nascimento/Idade:
• Gênero: Feminino
• Estado civil:
• Profissão:
• Data da consulta: ${date}
## Queixa Principal
Dor ao urinar.
## História da Doença Atual
Paciente refere início dos sintomas há dois dias (anteontem pela manhã), com piora significativa no
dia seguinte. Queixa-se de disúria caracterizada por ardência forte e sensação de queimação durante
a micção.
Apresenta polaciúria acentuada, com frequência miccional estimada em aproximadamente 15 a 20
vezes ao dia, associada a noctúria importante (acorda 3 a 4 vezes durante a noite para urinar). Relata
urgência miccional, com sensação de necessidade de urinar logo após ter esvaziado a bexiga, porém
com oligúria (baixo volume urinário em cada micção).
Refere dor em região suprapúbica (pé da barriga) em pontadas. Notou alteração no aspecto da urina,
que está com odor mais forte e coloração mais escurecida, negando hematúria macroscópica.
Nega febre e dor lombar ou em região de flancos. Relata sensação de cansaço leve.
Informa relação sexual no fim de semana anterior ao início dos sintomas.
## Interrogatório Sistemático
Sintomas Gerais: Nega febre. Refere cansaço leve.
Sistema Geniturinário:
• Disúria (ardência e queimação à micção)
• Polaciúria acentuada (15-20 micções/dia)
• Noctúria (3-4 episódios por noite)
• Urgência miccional
• Oligúria (baixo volume urinário por micção)
• Dor suprapúbica em pontadas
• Alteração do odor urinário (cheiro mais forte)
• Urina com coloração mais escurecida
• Nega hematúria
• Nega dor lombar ou em flancos
## Antecedentes Pessoais Patológicos
• Doenças prévias: Histórico de infecções urinárias: 2 episódios prévios, sendo o último
ocorrido há aproximadamente 1 ano.
• Cirurgias:
• Internações:
• Alergias:
• Transfusões:
## Medicamentos em Uso
Anticoncepcional oral (pílula anticoncepcional)
## Antecedentes Familiares
## História Social e Hábitos de Vida
• Tabagismo:
• Etilismo:
• Atividade física:
• Sono: Sono interrompido atualmente devido à noctúria (acorda 3-4 vezes por noite para
urinar)
• Alimentação:
• Ocupação/Trabalho:
• Moradia:
• Vida sexual: Sexualmente ativa. Relação sexual recente (fim de semana passado). Método
contraceptivo: anticoncepcional oral.
## Exame Físico Realizado
## Exames Complementares Realizados
Exame de Urina (Urina tipo I/EAS) - realizado em urgência durante a consulta:
• Leucócitos: 2 milhões (leucocitúria acentuada)
• Nitrito: positivo (indicando presença de bactérias)
## Hipótese Diagnóstica
Cistite (infecção da bexiga/infecção urinária baixa)
## Conduta
Prescrição Medicamentosa:
• Nitrofurantoína 100mg: tomar 1 comprimido de 6 em 6 horas por 5 dias (completar todo o
tratamento mesmo com melhora dos sintomas)
• Orientação: tomar preferencialmente junto com as refeições para evitar náuseas
Orientações Não Farmacológicas:
• Aumentar ingesta hídrica: beber pelo menos 2 litros de água por dia (auxilia na limpeza da
bexiga)
• Não reter urina: urinar sempre que sentir vontade
• Abstinência sexual: evitar relações sexuais até melhora completa do quadro
• Restrições dietéticas temporárias: evitar café, refrigerantes e bebidas alcoólicas (substâncias
que podem irritar a bexiga)
## Exames de Controle:
• Exame de urina de controle após término do tratamento (agendar para daqui a 1 semana)
para confirmar eliminação da infecção
## Retorno/Seguimento:
• Melhora esperada em 48 horas
• Retornar imediatamente se não houver melhora em 2 dias ou se surgirem sinais de alerta:
febre, dor lombar (dor nas costas/região dos rins) ou hematúria (sangue na urina)
## Observações Adicionais
O exame de urina foi realizado em caráter de urgência durante a própria consulta, com coleta
orientada pela enfermagem. O médico enfatizou especialmente a importância de completar os 5 dias
completos de antibioticoterapia, mesmo havendo melhora sintomática antes do término do
tratamento, para garantir a erradicação completa da infecção. A paciente demonstrou boa
compreensão de todas as orientações fornecidas.`;
    },
    '3': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># ANAMNESE
## Identificação
• Nome: ${name}
• Data de nascimento/Idade: 45 anos
• Gênero: Masculino
• Estado civil:
• Profissão:
• Data da consulta: ${date}
## Queixa Principal
Pressão arterial elevada detectada em medição na farmácia.
## História da Doença Atual
Paciente comparece à consulta após ter medido pressão arterial na farmácia no dia anterior à
consulta, com resultado de 160 x 100 mmHg. Refere que o farmacêutico orientou procura de
atendimento médico devido aos valores elevados.
Informa que realiza aferições ocasionais de pressão arterial na farmácia, porém esta foi a primeira
vez que apresentou valores tão elevados. Relata que em medições anteriores não prestava atenção
aos números específicos, mas nunca havia recebido alerta do farmacêutico sobre alterações.
Paciente encontra-se completamente assintomático. Nega cefaleia, tontura, dor torácica, dispneia ou
cansaço. Refere estranhamento por estar com pressão elevada sem apresentar qualquer sintoma.
## Interrogatório Sistemático
Sintomas Gerais: Nega sintomas. Refere sentir-se "normal".
Sistema Cardiovascular: Nega dor torácica, palpitações, dispneia e cansaço.
Sistema Neurológico: Nega cefaleia e tontura.
## Antecedentes Pessoais Patológicos
• Doenças prévias: Nega diabetes mellitus (nunca realizou exames para investigação). Nega
dislipidemia (nunca realizou exames para investigação). Relata não realizar check-up
médico há tempo considerável.
• Cirurgias:
• Internações:
• Alergias:
• Transfusões:
• Antropometria: Ganho ponderal de aproximadamente 10kg acima do peso ideal nos
últimos anos.
## Medicamentos em Uso
Nenhum medicamento em uso.
## Antecedentes Familiares
• Pai: Hipertensão arterial sistêmica em tratamento medicamentoso há anos.
• Mãe: Hipertensão arterial sistêmica desenvolvida após os 60 anos de idade.
## História Social e Hábitos de Vida
• Tabagismo: Não fuma.
• Etilismo: Consumo social de bebida alcoólica aos fins de semana (cerveja).
• Atividade física: Sedentário. Nega prática de atividade física. Refere cansaço ao chegar em
casa após o trabalho.
• Sono:
• Alimentação:
◦ Consumo frequente de "comida de rua" devido às demandas do trabalho
◦ Alto consumo de sal ("gosto de comida bem temperada")
◦ Dieta não saudável com uso excessivo de sal
• Ocupação/Trabalho: Trabalho que exige permanecer sentado durante todo o dia
(sedentarismo ocupacional).
• Moradia:
## Exame Físico Realizado
Sinais Vitais:
• Pressão arterial em membro superior direito: 160 x 100 mmHg
• Pressão arterial em membro superior esquerdo: 158 x 98 mmHg
Aparelho Cardiovascular:
• Ausculta cardíaca: normal
Aparelho Respiratório:
• Ausculta pulmonar: normal
• Padrão respiratório adequado durante o exame
Exame Físico Geral: Normal
## Exames Complementares Realizados
## Hipótese Diagnóstica
Hipertensão arterial sistêmica (a ser confirmada com monitorização).
## Conduta
Investigação Diagnóstica:
• Solicitada monitorização residencial da pressão arterial (MRPA):
◦ Aferir pressão arterial 2 vezes ao dia (uma medição pela manhã e outra à tarde ou
noite)
◦ Duração: 1 semana
◦ Registrar em tabela: data, horário e valores pressóricos
◦ Local de aferição: farmácia ou posto de saúde
Exames Complementares (a serem solicitados se confirmada hipertensão):
• Exames de sangue: glicemia, colesterol, função renal
• Exame de urina
• Objetivo: avaliar repercussão em órgãos-alvo e investigar fatores de risco cardiovascular
associados
Tratamento:
• Não iniciada medicação anti-hipertensiva no momento (aguardando confirmação diagnóstica
com MRPA)
Orientações Não Farmacológicas (iniciadas imediatamente):
• Redução drástica do consumo de sal (iniciar imediatamente, já no mesmo dia da consulta)
• Evitar alimentos industrializados e embutidos
• Atividade física: caminhar pelo menos 30 minutos por dia
• Perda de peso (enfatizado que cada quilo perdido auxilia no controle pressórico)
• Mudanças no estilo de vida de forma gradual (começar pela redução do sal, depois
introduzir exercícios progressivamente)
Sinais de Alerta:
• Procurar pronto-socorro imediatamente se apresentar: cefaleia forte, dor torácica, dispneia
ou visão turva
## Retorno/Seguimento:
• Retorno agendado em 1 semana (mesmo horário)
• Trazer registros da monitorização pressórica
• Após análise dos valores, será definida necessidade de tratamento medicamentoso
## Observações Adicionais
Esta é a primeira vez que a hipertensão arterial é documentada em ambiente de consultório médico.
O paciente demonstrou preocupação com o achado da pressão elevada, especialmente por estar
assintomático. O médico optou por estratégia de confirmação diagnóstica através de monitorização
domiciliar antes de iniciar tratamento medicamentoso, enfatizando a importância das medidas não
farmacológicas. Foi reforçada especialmente a necessidade de início imediato da restrição de sal,
antes mesmo da confirmação definitiva do diagnóstico. O paciente compreendeu as orientações e
concordou em seguir o plano proposto.`;
    }
  },
  evolucao_clinica: {
    '1': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># EVOLUÇÃO CLÍNICA
Data: ${date}
Paciente: ${name}

## S (Subjetivo)
Paciente refere cefaleia há 3 dias que não passa. Relata dor localizada principalmente na região frontal, com irradiação ocasional para têmporas. Descreve dor de característica pulsátil, constante, com períodos de piora. Queixa-se de fotofobia importante, com piora da dor em ambientes claros e ao olhar para tela de celular, referindo estar evitando sair de casa durante o dia. Nega febre, náusea, vômito, sintomas de resfriado ou congestão nasal. Refere ter utilizado paracetamol no dia anterior sem melhora significativa. Relata trabalho corrido e estresse. Informa padrão de sono de aproximadamente 5 a 6 horas por noite.

## O (Objetivo)
Paciente em bom estado geral, corado, hidratado. PA: 120/80 mmHg. Exame ocular realizado com resposta adequada à movimentação ocular. À palpação de cabeça e pescoço, paciente refere dor leve em alguns pontos palpados. Identificada tensão muscular em região cervical e ombros. Exame neurológico sem alterações.

## A (Avaliação)
Cefaleia tensional, relacionada a estresse, má postura, tensão muscular e privação de sono.

## P (Plano)
- **Prescrito naproxeno 500mg:** 1 comprimido imediatamente e repetir 1 comprimido após 12 horas se dor persistir
- **Orientado repouso** com pelo menos 8 horas de sono por noite nos próximos dias
- **Sugerido afastamento do trabalho** por 2 dias, se possível
- **Recomendado evitar tempo prolongado** em computador ou celular
- **Orientado manter ambiente** com iluminação reduzida
- **Demonstrados exercícios de alongamento** para pescoço e ombros: rotação lenta da cabeça para cada lado, mantendo posição por 5 segundos
- **Orientado retorno imediato** se não houver melhora completa em 3 dias, ou se surgirem febre, vômito ou piora importante da dor`;
    },
    '2': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># EVOLUÇÃO CLÍNICA
Data: ${date}
Paciente: ${name}

## S (Subjetivo)
Paciente refere dor ao urinar iniciada há 2 dias (anteontem pela manhã), com piora no dia anterior. Descreve dor como ardência forte e queimação. Relata polaciúria importante, com frequência miccional estimada em 15 a 20 vezes ao dia, com sensação de urgência e baixo volume urinário em cada micção. Refere noctúria, acordando 3 a 4 vezes durante a noite para urinar. Queixa-se de pontadas em região suprapúbica ("pé da barriga"). Relata alteração no odor da urina (cheiro mais forte) e coloração mais escura, porém nega hematúria. Nega febre. Refere sentir-se um pouco cansada. Nega dor lombar ou em região dos rins. Informa relação sexual no fim de semana passado. Faz uso de anticoncepcional oral. História prévia de infecção urinária (2 episódios anteriores, último há 1 ano).

## O (Objetivo)
Exame de urina (urgência): leucócitos 2 milhões, nitrito positivo.

## A (Avaliação)
Infecção urinária - Cistite (infecção na bexiga).

## P (Plano)
- **Prescrito nitrofurantoína 100mg:** 1 comprimido de 6 em 6 horas por 5 dias. Orientado tomar até o final do tratamento mesmo que os sintomas melhorem antes. Recomendado tomar junto com as refeições para evitar enjoo.
- **Orientado ingestão hídrica** de pelo menos 2 litros de água por dia para auxiliar na limpeza da bexiga
- **Recomendado evitar relações sexuais** nos próximos dias até melhora completa
- **Orientado não segurar urina,** ir ao banheiro sempre que tiver vontade
- **Recomendado evitar café,** refrigerante e bebidas alcoólicas pois podem irritar a bexiga
- **Informado que melhora significativa** dos sintomas geralmente ocorre em 48 horas
- **Orientado retorno imediato** se não houver melhora em 2 dias, ou se aparecer febre, dor nas costas ou sangue na urina
- **Solicitado exame de urina de controle** após término do tratamento, a ser realizado em 1 semana, para confirmar eliminação da infecção`;
    },
    '3': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># EVOLUÇÃO CLÍNICA
Data: ${date}
Paciente: ${name}

## S (Subjetivo)
Paciente comparece à consulta após medição de pressão arterial em farmácia no dia anterior, com resultado de 160/100 mmHg. Refere medir pressão ocasionalmente em farmácia, porém nunca havia apresentado valores tão elevados, sendo orientado pelo farmacêutico a procurar atendimento médico. Nega sintomas como cefaleia, tontura, dor torácica, dispneia ou astenia, referindo sentir-se normal. História familiar positiva para hipertensão arterial: pai em uso de anti-hipertensivos há anos e mãe com diagnóstico após os 60 anos de idade. Paciente com 45 anos. Relata ganho ponderal de aproximadamente 10kg nos últimos anos, estimando estar cerca de 10kg acima do peso ideal. Nega prática de atividade física, referindo trabalho sedentário (sentado durante todo o dia) e cansaço ao chegar em casa. Quanto à alimentação, relata consumo frequente de comida de rua devido ao trabalho e preferência por alimentos bem temperados. Não tabagista. Etilismo social aos fins de semana (cerveja). Nega uso de medicações. Nega diagnóstico prévio de diabetes mellitus ou dislipidemia, referindo não ter realizado exames para investigação. Relata não fazer check-up há tempo.

## O (Objetivo)
PA (braço direito): 160/100 mmHg. PA (braço esquerdo): 158/98 mmHg. Exames cardiovascular e respiratório sem alterações.

## A (Avaliação)
Hipertensão arterial (primeira documentação em consultório médico).

## P (Plano)
- **Solicitado monitorização domiciliar da pressão arterial:** realizar medições 2 vezes ao dia (uma pela manhã e outra à tarde ou noite) durante 1 semana, em farmácia ou posto de saúde, anotando em tabela com data, horário e valores obtidos
- **Retorno agendado** em 1 semana (mesmo horário) com as anotações das medições para avaliação
- **Caso confirmada hipertensão arterial:** serão solicitados exames de sangue e urina para avaliar repercussão em órgãos-alvo, colesterol, glicemia e função renal
- **Orientações não farmacológicas iniciadas imediatamente:**
  - Redução drástica de sal na dieta
  - Evitar alimentos industrializados e embutidos
  - Caminhada de pelo menos 30 minutos por dia
  - Perda de peso (cada quilo perdido auxilia no controle pressórico)
  - Mudanças graduais recomendadas: iniciar com redução de sal, depois introduzir exercícios progressivamente
- **Orientado retorno imediato ao pronto-socorro** se apresentar: cefaleia forte, dor torácica, dispneia ou visão turva
- **Se permanecer assintomático:** realizar medições conforme orientado e retornar na data agendada`;
    },
  },
  prescricao_simples: {
    '1': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># PRESCRIÇÃO SIMPLES
### CABEÇALHO
**Médico/Clínica:** _______________________ **CRM:** _______________________
**Endereço:** _______________________ **Telefone:** _______________________

### IDENTIFICAÇÃO DO PACIENTE
**Nome:** ${name}
**Endereço:** _______________________

### PRESCRIÇÃO
**1. Naproxeno 500mg - Comprimido**
   - **Via de administração:** Oral
   - **Posologia:** Tomar 1 comprimido agora e outro após 12 horas se a dor persistir
   - **Duração:** Conforme necessidade (uso condicional)

### ORIENTAÇÕES COMPLEMENTARES
- **REPOUSO:** Fundamental para a recuperação
- **SONO:** Dormir pelo menos 8 horas por noite nos próximos dias
- **AFASTAMENTO:** Se possível, tirar pelo menos 2 dias de descanso do trabalho
- **AMBIENTE:** Manter ambiente com luz mais baixa (fotofobia presente)
- **EVITAR:** Tempo prolongado no computador ou celular
- **EXERCÍCIOS:** Realizar alongamentos no pescoço e ombros
  - Girar a cabeça devagar para um lado, segurar 5 segundos, depois para o outro lado
- **RETORNO:**
  - Se em 3 dias não melhorar completamente, retornar
  - Retornar IMEDIATAMENTE se aparecer: febre, vômito ou piora importante da dor
- **OBSERVAÇÕES:** Quadro compatível com cefaleia tensional relacionada a estresse, má postura, tensão muscular e privação de sono

### DATA E ASSINATURA
**Data:** ${date}
**Assinatura:** _______________________`;
    },
    '2': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># PRESCRIÇÃO SIMPLES
### CABEÇALHO
**Médico/Clínica:** _______________________ **CRM:** _______________________
**Endereço:** _______________________ **Telefone:** _______________________

### IDENTIFICAÇÃO DO PACIENTE
**Nome:** ${name}
**Endereço:** _______________________

### PRESCRIÇÃO
**1. Nitrofurantoína 100mg - Comprimido**
   - **Via de administração:** Oral
   - **Posologia:** Tomar 1 comprimido de 6 em 6 horas
   - **Duração:** Por 5 dias

### ORIENTAÇÕES COMPLEMENTARES
- **HIDRATAÇÃO:** Beber bastante água, pelo menos 2 litros por dia (ajuda a limpar a bexiga)
- **ADMINISTRAÇÃO DO MEDICAMENTO:**
  - Tomar junto com as refeições para evitar enjoo
  - Continuar tomando o antibiótico até o final dos 5 dias, mesmo que os sintomas melhorem antes
- **RESTRIÇÕES ALIMENTARES:**
  - Evitar café
  - Evitar refrigerante
  - Evitar bebidas alcoólicas (podem irritar a bexiga)
- **HÁBITOS URINÁRIOS:** Evitar segurar o xixi, ir ao banheiro sempre que tiver vontade
- **RESTRIÇÃO SEXUAL:** Evitar relações sexuais nos próximos dias até melhorar completamente
- **EVOLUÇÃO ESPERADA:** Geralmente em 48 horas já há melhora significativa dos sintomas
- **EXAME DE CONTROLE:** Fazer exame de urina de controle após terminar o tratamento (daqui a uma semana) para confirmar que a infecção foi eliminada
- **RETORNO IMEDIATO SE:**
  - Não melhorar em 2 dias
  - Aparecer febre
  - Aparecer dor nas costas
  - Aparecer sangue na urina
- **DIAGNÓSTICO:** Cistite (infecção na bexiga)

### DATA E ASSINATURA
**Data:** ${date}
**Assinatura:** _______________________`;
    },
    '3': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># PRESCRIÇÃO SIMPLES
### CABEÇALHO
**Médico/Clínica:** _______________________ **CRM:** _______________________
**Endereço:** _______________________ **Telefone:** _______________________

### IDENTIFICAÇÃO DO PACIENTE
**Nome:** ${name}
**Endereço:** _______________________

### PRESCRIÇÃO
Nenhum medicamento prescrito nesta consulta.

### ORIENTAÇÕES COMPLEMENTARES
- **DIAGNÓSTICO:** Hipertensão arterial (primeira documentação em consultório)
  - **Pressão arterial verificada:** 160x100 mmHg e 158x98 mmHg
- **MONITORAMENTO DA PRESSÃO ARTERIAL:**
  - Medir a pressão 2 vezes por dia durante 1 semana
  - Uma medição pela manhã e outra à tarde ou noite
  - **Local:** pode ser na farmácia ou posto de saúde
  - Fazer uma tabelinha anotando: data, horário e valores
  - Trazer as anotações no retorno
- **MUDANÇAS NO ESTILO DE VIDA: ALIMENTAÇÃO:**
  - Reduzir o sal drasticamente (começar hoje mesmo)
  - Evitar alimentos industrializados
  - Evitar embutidos
- **ATIVIDADE FÍSICA:**
  - Caminhar pelo menos 30 minutos por dia
  - Começar aos poucos
- **PERDA DE PESO:**
  - Perder peso (cada quilo perdido ajuda no controle da pressão)
  - Paciente está aproximadamente 10 kg acima do peso ideal
- **EXAMES COMPLEMENTARES:** Serão solicitados exames de sangue e urina se a hipertensão for confirmada (para avaliar repercussão nos órgãos, colesterol, glicemia e função renal)
- **RETORNO:** Semana que vem (mesmo horário)
- **SINAIS DE ALERTA - PROCURAR PRONTO-SOCORRO IMEDIATAMENTE SE:**
  - Dor de cabeça forte
  - Dor no peito
  - Falta de ar
  - Visão turva
- **OBSERVAÇÕES:**
  - Decisão sobre início de medicação será tomada após confirmação dos valores pressóricos e resultados de exames
  - **Histórico familiar positivo:** pai com hipertensão, mãe desenvolveu após 60 anos
  - **Paciente:** 45 anos, sedentário, alimentação inadequada (excesso de sal)

### DATA E ASSINATURA
**Data:** ${date}
**Assinatura:** _______________________`;
    },
  },
  prescricao_controle_especial: {
    '1': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br>

RECEITUÁRIO DE CONTROLE ESPECIAL
IDENTIFICAÇÃO DO EMITENTE
Nome do Médico: _______________________
CRM: _______________________
Especialidade: _______________________
Endereço: _______________________
Telefone: _______________________
----------------------------------------
IDENTIFICAÇÃO DO PACIENTE
Nome Completo: ${name}
Endereço: _______________________
Telefone: _______________________
RG: _______________________
CPF: _______________________
----------------------------------------
IDENTIFICAÇÃO DO COMPRADOR (se diferente do paciente)
Nome: _______________________
RG: _______________________
Endereço: _______________________
----------------------------------------
PRESCRIÇÃO MÉDICA
________________________________________
Medicamento #1
Via de Administração: Oral
Nome do Medicamento: Naproxeno
Forma Farmacêutica: Comprimido
Dosagem: 500mg
Posologia: 1 comprimido imediatamente, depois 1 comprimido após 12 horas se a dor persistir
Duração do Tratamento: _______________________
Quantidade Total: _______________________
Observações:
- Repouso fundamental para recuperação
- Dormir pelo menos 8 horas por noite nos próximos dias
- Se possível, tirar pelo menos 2 dias para descansar do trabalho
- Evitar uso prolongado de computador ou celular
- Manter ambiente com iluminação reduzida
- Realizar alongamentos de pescoço e ombros (rotação lenta da cabeça para cada lado, segurando 5 segundos)
- RETORNAR IMEDIATAMENTE se: em 3 dias não houver melhora completa, ou se aparecer febre, vômito, ou piora significativa da dor
________________________________________
Diagnóstico: Cefaleia tensional relacionada a estresse, má postura, tensão muscular e privação de sono
Data: ${date}
Assinatura: _________________________
CAMPOS PARA PREENCHIMENTO PELA FARMÁCIA
(Uso exclusivo da farmácia dispensadora)
Data da Dispensação: ___/___/______
Farmacêutico Responsável: _____________
CRF: __________________________________
Assinatura: ___________________________

### OBSERVAÇÃO IMPORTANTE
**ESTE MEDICAMENTO NÃO REQUER RECEITUÁRIO DE CONTROLE ESPECIAL**

O Naproxeno 500mg é um anti-inflamatório não esteroidal (AINE) que requer receita médica simples, mas **NÃO** está listado na Portaria SVS/MS nº 344/98 como medicamento de controle especial.

Para esta prescrição, seria adequado utilizar:
- Receituário Simples (branco)
- Validade: 30 dias
- Não requer retenção de via pela farmácia
- Não requer notificação à autoridade sanitária
`;
    },
    '2': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br>
RECEITUÁRIO DE CONTROLE ESPECIAL
IDENTIFICAÇÃO DO EMITENTE
Nome do Médico: _______________________
CRM: _______________________
Especialidade: _______________________
Endereço: _______________________
Telefone: _______________________
----------------------------------------
IDENTIFICAÇÃO DO PACIENTE
Nome Completo: ${name}
Endereço: _______________________
Telefone: _______________________
RG: _______________________
CPF: _______________________
----------------------------------------
IDENTIFICAÇÃO DO COMPRADOR (se diferente do paciente)
Nome: _______________________
RG: _______________________
Endereço: _______________________
----------------------------------------
PRESCRIÇÃO MÉDICA
________________________________________
Medicamento #1
Via de Administração: Oral
Nome do Medicamento: Nitrofurantoína
Forma Farmacêutica: Comprimido
Dosagem: 100mg
Posologia: 1 comprimido de 6 em 6 horas
Duração do Tratamento: 5 dias
Quantidade Total: 20 comprimidos
Observações:
- Tomar junto com as refeições para evitar enjoo
- Continuar tomando até o final dos 5 dias, mesmo que os sintomas melhorem antes
- Beber bastante água, pelo menos 2 litros por dia (ajuda a limpar a bexiga)
- Evitar relações sexuais até melhorar completamente
- Não segurar a urina, ir ao banheiro sempre que tiver vontade
- Evitar café, refrigerante e bebidas alcoólicas (podem irritar a bexiga)
- Melhora significativa esperada em 48 horas
- Fazer exame de urina de controle após terminar o tratamento (agendar para daqui a 1 semana) para confirmar eliminação da infecção
- RETORNAR IMEDIATAMENTE se: não houver melhora em 2 dias, ou se aparecer febre, dor nas costas ou sangue na urina
________________________________________
Diagnóstico: Cistite (infecção urinária na bexiga)
Exame Laboratorial Realizado: Exame de Urina (EAS)
- Leucócitos: 2.000.000
- Nitrito: Positivo
- Interpretação: Presença de células de defesa e bactérias indicando infecção
Data: ${date}
Assinatura: _________________________
CAMPOS PARA PREENCHIMENTO PELA FARMÁCIA
(Uso exclusivo da farmácia dispensadora)
Data da Dispensação: ___/___/______
Farmacêutico Responsável: _____________
CRF: __________________________________
Assinatura: ___________________________

### OBSERVAÇÃO IMPORTANTE
**ESTE MEDICAMENTO NÃO REQUER RECEITUÁRIO DE CONTROLE ESPECIAL**

A Nitrofurantoína 100mg é um antibiótico que requer receita médica simples, mas **NÃO** está listada na Portaria SVS/MS nº 344/98 como medicamento de controle especial.

Para esta prescrição, seria adequado utilizar:
- Receituário Simples (branco)
- Receita de Antimicrobiano conforme RDC nº 20/2011
- **Validade:** 10 dias (específico para antimicrobianos)
- **Retenção obrigatória** pela farmácia (conforme legislação de antimicrobianos)
- Não requer notificação à autoridade sanitária como controle especial

#### Informações Clínicas Adicionais
**Quadro Clínico Apresentado:**
- Disúria (dor/ardência ao urinar) há 2 dias
- Polaciúria (aumento da frequência urinária: 15-20x/dia)
- Noctúria (3-4 episódios noturnos)
- Dor em baixo ventre (pontadas no pé da barriga)
- Urina com odor forte e coloração mais escura
- Sem febre, sem hematúria, sem dor lombar
- **Histórico:** 2 episódios prévios de ITU (último há 1 ano)
- Relação sexual recente (fim de semana passado)
`;
    },
    '3': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br>
### OBSERVAÇÃO IMPORTANTE
Após análise completa e minuciosa da transcrição fornecida, **NÃO FOI IDENTIFICADA PRESCRIÇÃO DE MEDICAMENTOS** nesta consulta.

#### RESUMO DA CONSULTA
- **Motivo da Consulta:** Hipertensão arterial detectada (160x100 mmHg em medição na farmácia)
- **Conduta Médica Adotada:**
  1. Monitorização ambulatorial da pressão arterial (MAPA caseiro)
  2. Orientações não farmacológicas
  3. Retorno agendado para reavaliação

---

DOCUMENTO DE ORIENTAÇÕES MÉDICAS
IDENTIFICAÇÃO DO PROFISSIONAL
Nome do Médico: _______________________
CRM: _______________________
Especialidade: _______________________
Endereço: _______________________
Telefone: _______________________
----------------------------------------
IDENTIFICAÇÃO DO PACIENTE
Nome Completo: ${name}
Idade: 45 anos
Endereço: _______________________
Telefone: _______________________
----------------------------------------
DADOS CLÍNICOS DA CONSULTA
Queixa Principal: Pressão arterial elevada detectada em farmácia
Pressão Arterial Aferida em Consultório:
- Braço 1: 160 x 100 mmHg
- Braço 2: 158 x 98 mmHg
Histórico Familiar: Hipertensão arterial (pai e mãe)
Fatores de Risco Identificados:
- Sedentarismo
- Sobrepeso (aproximadamente 10kg acima do peso ideal)
- Dieta rica em sódio
- Consumo frequente de alimentos industrializados
- Trabalho sedentário
Exame Físico: Ausculta cardíaca e pulmonar normais
----------------------------------------
ORIENTAÇÕES E CONDUTA
1. MONITORIZAÇÃO DA PRESSÃO ARTERIAL
- Medir pressão arterial 2 vezes ao dia durante 7 dias
- Horários: 1x pela manhã e 1x à tarde ou noite
- Local: Farmácia ou posto de saúde
- Anotar em tabela: data, horário e valores obtidos
- Trazer as anotações no retorno
2. MODIFICAÇÕES NO ESTILO DE VIDA (iniciar imediatamente)
a) Restrição de Sódio:
- Reduzir sal drasticamente
- Evitar alimentos industrializados
- Evitar embutidos
- Reduzir consumo de comida de rua
b) Atividade Física:
- Caminhada de 30 minutos por dia
- Começar gradualmente
c) Controle de Peso:
- Meta: perda gradual de peso
- Cada quilo perdido auxilia no controle pressórico
3. SINAIS DE ALERTA - PROCURAR PRONTO-SOCORRO SE:
- Dor de cabeça forte
- Dor no peito
- Falta de ar
- Visão turva
4. EXAMES COMPLEMENTARES
- Serão solicitados após confirmação diagnóstica no retorno:
* Exames de sangue (glicemia, colesterol, função renal)
* Exame de urina
- Objetivo: avaliar repercussão em órgãos-alvo
5. PLANO TERAPÊUTICO FUTURO
- Decisão sobre início de medicação anti-hipertensiva será
tomada após:
* Confirmação dos valores de PA no monitoramento domiciliar
* Avaliação dos exames complementares
* Análise da resposta às medidas não farmacológicas
----------------------------------------
RETORNO AGENDADO
Data: 1 semana após esta consulta
Horário: Mesmo horário desta consulta
Trazer: Tabela com todas as medições de pressão arterial
----------------------------------------
Data da Consulta: ${date}
Assinatura: _________________________
`;
    },
  },
  exames_procedimentos: {
    '1': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br>
REQUISIÇÃO DE EXAMES E PROCEDIMENTOS
CABEÇALHO
Nome do Médico: _______________________
CRM: _______________________
RQE: _______________________
Endereço: _______________________
Contato: _______________________
IDENTIFICAÇÃO DO PACIENTE
Nome Completo: ${name}
CPF: _______________________
DATA DE EMISSÃO
Data: ${date}
INDICAÇÃO CLÍNICA
Paciente apresenta quadro de cefaleia há três dias, com dor localizada
em região frontal (testa) e eventual extensão para regiões temporais.
Relata dor de caráter pulsátil constante, com episódios de piora.
Apresenta fotofobia importante, com exacerbação dos sintomas em
ambientes claros ou ao utilizar dispositivos eletrônicos.
Ao exame físico: PA 120x80 mmHg, paciente corado e hidratado, exame
neurológico sem alterações, movimentação ocular preservada. Identificada
tensão muscular significativa em região cervical e ombros, com dor à
palpação em pontos específicos de cabeça e pescoço.
Contexto: Paciente refere estresse ocupacional importante, com rotina de
trabalho intensificada e privação crônica de sono (5-6 horas por noite).
Hipótese diagnóstica: Cefaleia tensional secundária a estresse, tensão
muscular cervical, má postura e privação de sono.
EXAMES SOLICITADOS
[NENHUM EXAME FOI SOLICITADO NA TRANSCRIÇÃO]
PRESCRIÇÃO MÉDICA
- Naproxeno 500mg - tomar 1 comprimido imediatamente e repetir após
12 horas se persistência da dor
OBSERVAÇÕES E ORIENTAÇÕES
- Repouso domiciliar recomendado por 2 dias, se possível
- Estabelecer rotina de sono de no mínimo 8 horas por noite
- Reduzir exposição a telas (computador/celular)
- Manter ambiente com iluminação reduzida devido à fotofobia
- Realizar alongamentos cervicais e de ombros regularmente (movimentos
lentos de rotação cervical, mantendo 5 segundos em cada lado)
- RETORNAR IMEDIATAMENTE se: não houver melhora em 3 dias, surgirem
febre ou vômitos, ou houver piora significativa da cefaleia
ASSINATURA
_____________________________________________
Assinatura e Carimbo do Médico
`;
    },
    '2': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br>
REQUISIÇÃO DE EXAMES E PROCEDIMENTOS
CABEÇALHO
Nome do Médico: _______________________
CRM: _______________________
RQE: _______________________
Endereço: _______________________
Contato: _______________________
IDENTIFICAÇÃO DO PACIENTE
Nome Completo: ${name}
CPF: _______________________
DATA DE EMISSÃO
Data: ${date}
INDICAÇÃO CLÍNICA
Paciente do sexo feminino apresenta quadro de disúria há 2 dias, com
início há 48 horas e piora progressiva nas últimas 24 horas. Relata
ardência e queimação intensa durante a micção, associada a urgência
miccional importante e polaciúria acentuada (aproximadamente 15-20
micções diárias), com eliminação de pequenos volumes urinários.
Apresenta noctúria significativa (acordando 3-4 vezes por noite para
urinar). Refere dor em pontadas em região suprapúbica.
Alterações urinárias: odor fétido e coloração mais escura da urina,
sem hematúria macroscópica. Paciente nega febre ou dor lombar.
Antecedentes: História de infecção urinária prévia (2 episódios, último
há 1 ano). Relação sexual recente (fim de semana anterior ao início dos
sintomas). Em uso de anticoncepcional oral.
Exame de urina tipo I realizado em caráter de urgência evidenciou:
2.000.000 de leucócitos/mL e nitrito positivo, confirmando processo
infeccioso bacteriano.
Hipótese diagnóstica: Cistite aguda (infecção do trato urinário baixo).
EXAMES SOLICITADOS
- Exame de Urina Tipo I (EAS) de controle - a ser realizado após
conclusão do tratamento antibiótico (em aproximadamente 7 dias)
PRESCRIÇÃO MÉDICA
- Nitrofurantoína 100mg - tomar 1 comprimido de 6 em 6 horas por 5 dias
(Orientação: tomar preferencialmente junto com as refeições)
OBSERVAÇÕES E ORIENTAÇÕES
- Manter antibioticoterapia pelo período completo de 5 dias, mesmo com
melhora dos sintomas
- Aumentar ingesta hídrica para no mínimo 2 litros de água por dia
- Evitar segurar urina - urinar sempre que houver vontade
- Abstinência sexual temporária até resolução completa do quadro
- Evitar consumo de café, refrigerantes e bebidas alcoólicas durante o
tratamento
- Melhora esperada em aproximadamente 48 horas do início do tratamento
- RETORNAR IMEDIATAMENTE se: ausência de melhora em 2 dias, surgimento
de febre, dor lombar ou hematúria (sangue na urina)
- Realizar exame de urina de controle após término do tratamento para
confirmar erradicação da infecção
ASSINATURA
_____________________________________________
Assinatura e Carimbo do Médico
`;
    },
    '3': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br>
REQUISIÇÃO DE EXAMES E PROCEDIMENTOS
CABEÇALHO
Nome do Médico: _______________________
CRM: _______________________
RQE: _______________________
Endereço: _______________________
Contato: _______________________
IDENTIFICAÇÃO DO PACIENTE
Nome Completo: ${name}
CPF: _______________________
DATA DE EMISSÃO
Data: ${date}
INDICAÇÃO CLÍNICA
Paciente masculino, 45 anos, procura atendimento após verificação de
pressão arterial elevada em farmácia (160 x 100 mmHg) realizada no dia
anterior. Paciente assintomático, sem queixas de cefaleia, tontura, dor
torácica, dispneia ou cansaço. Refere que realizava aferições ocasionais
em farmácia, mas nunca havia sido alertado sobre valores elevados.
Fatores de risco cardiovascular identificados: história familiar
positiva para hipertensão arterial sistêmica (pai em uso de
anti-hipertensivos, mãe com HAS após 60 anos), ganho ponderal recente
(aproximadamente 10kg acima do peso ideal), sedentarismo (ocupação
laboral sedentária sem prática de atividade física regular), hábitos
alimentares inadequados (alto consumo de alimentos de rua e sal),
etilismo social (consumo de cerveja nos fins de semana). Nega tabagismo.
Desconhece presença de diabetes mellitus ou dislipidemia, pois não
realiza exames de rotina há tempo prolongado. Não faz uso de medicações.
Ao exame físico: PA aferida no consultório = 160 x 100 mmHg (membro
superior direito) e 158 x 98 mmHg (membro superior esquerdo). Exames
cardiovascular e pulmonar sem alterações.
Hipótese diagnóstica: Hipertensão Arterial Sistêmica em investigação.
Conduta: Solicitada monitorização domiciliar da pressão arterial (MAPA
casual) por 7 dias, com aferições 2 vezes ao dia (período matutino e
vespertino/noturno), com registro dos valores. Retorno agendado em 1
semana para reavaliação com os dados coletados. Caso confirmada HAS,
serão solicitados exames laboratoriais complementares para avaliação de
repercussão em órgãos-alvo e rastreamento de comorbidades.
EXAMES SOLICITADOS
[NENHUM EXAME FOI SOLICITADO NESTA CONSULTA]
Observação: Médico informou que, caso hipertensão seja confirmada no
retorno após monitorização domiciliar, serão solicitados exames de
sangue e urina para avaliação de repercussão orgânica, perfil lipídico,
glicemia e função renal.
PRESCRIÇÃO MÉDICA
[NENHUMA MEDICAÇÃO FOI PRESCRITA NESTA CONSULTA]
OBSERVAÇÕES E ORIENTAÇÕES
MONITORIZAÇÃO:
- Realizar aferição de pressão arterial 2 vezes ao dia durante 7 dias
consecutivos (1 medida matutinal e 1 medida vespertina ou noturna)
- Anotar todas as medições em tabela com data, horário e valores obtidos
- Aferições podem ser realizadas em farmácia ou unidade de saúde
- Retorno agendado em 1 semana com registro das medições
ORIENTAÇÕES NÃO FARMACOLÓGICAS (início imediato):
- Redução drástica do consumo de sal na dieta
- Evitar alimentos industrializados e embutidos
- Iniciar programa de atividade física: caminhadas de 30 minutos diários
- Perda de peso gradual (cada quilo perdido contribui para controle
pressórico)
- Implementação progressiva das mudanças de estilo de vida
SINAIS DE ALERTA - PROCURAR PRONTO-SOCORRO IMEDIATAMENTE se
apresentar:
- Cefaleia intensa
- Dor torácica
- Dispneia (falta de ar)
- Visão turva ou alterações visuais
ASSINATURA
_____________________________________________
Assinatura e Carimbo do Médico
`;
    },
  },
  encaminhamento: {
    '1': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># ENCAMINHAMENTO MÉDICO

### Identificação:
- **Médico Remetente:** _______________________
- **CRM:** _______________________
- **Paciente:** ${name}

### Destinatário:
- **Especialista/Serviço:** [Não há encaminhamento]
- **Especialidade:** [Não há encaminhamento]

### Resumo Clínico:
**Queixa Principal:**
- Cefaleia há 3 dias

**Características da dor:**
- **Localização:** região frontal (testa) com irradiação para têmporas
- **Padrão:** constante com períodos de exacerbação
- **Tipo:** pulsátil
- Fotofobia importante (piora com luz e uso de dispositivos eletrônicos)

**Sintomas associados:**
- Ausência de febre, náuseas, vômitos, sintomas respiratórios ou rinorreia

**Antecedentes imediatos:**
- Uso de paracetamol com resposta insatisfatória
- Estresse ocupacional
- Privação de sono (5-6 horas/noite)

**Exame Físico:**
- **Pressão arterial:** 120/80 mmHg
- **Exame pupilar e motilidade ocular:** normais
- **Palpação cervical:** sensibilidade dolorosa leve em pontos cervicais
- Tensão muscular em região cervical e escapular
- **Exame neurológico:** sem alterações
- **Estado geral:** corado, hidratado

### Hipótese Diagnóstica:
Cefaleia tensional secundária a estresse, tensão muscular, má postura e privação de sono

### Conduta:
- Naproxeno 500mg (1 comprimido imediatamente + 1 após 12 horas se necessário)
- Repouso de 2 dias
- Higiene do sono (8 horas/noite)
- Redução de exposição a telas
- Ambiente com iluminação reduzida
- Alongamentos cervicais e escapulares
- Retorno se persistência após 3 dias ou surgimento de febre, vômitos ou piora importante

### Motivo do Encaminhamento:
[Não há indicação de encaminhamento nesta consulta]

**Data:** ${date}
**Assinatura:** _______________________

---
*Nota: Esta transcrição corresponde a uma consulta com resolução no nível primário, sem necessidade de encaminhamento para especialista. O paciente recebeu diagnóstico, tratamento e orientações para manejo da cefaleia tensional.*
`;
    },
    '2': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># ENCAMINHAMENTO MÉDICO

### Identificação:
- **Médico Remetente:** _______________________
- **CRM:** _______________________
- **Paciente:** ${name}

### Destinatário:
- **Especialista/Serviço:** [Não há encaminhamento]
- **Especialidade:** [Não há encaminhamento]

### Resumo Clínico:
**Queixa Principal:**
- Disúria (dor ao urinar) há 2 dias, com piora progressiva

**Sintomas Associados:**
- Polaciúria acentuada (aproximadamente 15-20 micções/dia)
- Noctúria importante (3-4 episódios/noite)
- Ardência intensa à micção
- Pontadas em hipogástrio (pé da barriga)
- Sensação de esvaziamento vesical incompleto
- Urina com odor forte
- Urina mais escura (sem hematúria visível)
- Astenia leve
- Ausência de febre
- Ausência de dor lombar

**Antecedentes Relevantes:**
- Relação sexual no fim de semana passado
- História de 2 episódios prévios de infecção urinária (último episódio há 1 ano)
- Uso de anticoncepcional oral

**Exame Complementar:**
- **Exame de Urina Tipo I (EAS):**
  - Leucócitos: 2.000.000/mL
  - Nitrito: positivo

### Hipótese Diagnóstica:
Cistite aguda (infecção do trato urinário baixo)

### Conduta Instituída:
- Nitrofurantoína 100mg via oral, 6/6 horas por 5 dias
- Hidratação abundante (mínimo 2 litros/dia)
- Abstinência sexual até resolução completa do quadro
- Evitar retenção urinária
- Evitar irritantes vesicais (café, refrigerantes, bebidas alcoólicas)
- Exame de urina de controle após conclusão do tratamento (1 semana)
- Orientação de retorno imediato se: ausência de melhora em 48h, surgimento de febre, dor lombar ou hematúria

### Motivo do Encaminhamento:
[Não há indicação de encaminhamento nesta consulta]

**Data:** ${date}
**Assinatura:** _______________________

---
*Nota: Consulta com resolução no nível primário. Diagnóstico de cistite aguda não complicada com tratamento ambulatorial adequado instituído.*
`;
    },
    '3': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># ENCAMINHAMENTO MÉDICO

### Identificação:
- **Médico Remetente:** _______________________
- **CRM:** _______________________
- **Paciente:** ${name}

### Destinatário:
- **Especialista/Serviço:** [Não há encaminhamento]
- **Especialidade:** [Não há encaminhamento]

### Resumo Clínico:
**Queixa Principal:**
- Pressão arterial elevada detectada em farmácia (160x100 mmHg)

**História da Doença Atual:**
- Paciente assintomático
- Mede pressão ocasionalmente em farmácia, mas nunca havia apresentado valores significativamente elevados
- Ausência de cefaleia, tontura, dor torácica, dispneia ou cansaço

**Dados Demográficos e Antecedentes:**
- **Idade:** 45 anos
- **Antecedentes familiares:** pai com HAS em tratamento medicamentoso; mãe com HAS após 60 anos
- Nega comorbidades conhecidas (diabetes e dislipidemia não investigadas previamente)
- Ausência de check-up recente

**Fatores de Risco Cardiovascular:**
- Sobrepeso (aproximadamente 10kg acima do peso ideal)
- Sedentarismo (trabalho sedentário, ausência de atividade física regular)
- Dieta inadequada: alto consumo de sódio, alimentação frequente em restaurantes ("comida de rua")
- Etilismo social (cerveja aos fins de semana)
- Não tabagista

**Medicações em Uso:**
- Nenhuma

**Exame Físico:**
- **PA em membro superior direito:** 160x100 mmHg
- **PA em membro superior esquerdo:** 158x98 mmHg
- **Exame cardiopulmonar:** sem alterações

### Hipótese Diagnóstica:
Hipertensão Arterial Sistêmica (primeira documentação em consultório médico)

### Conduta Instituída:
- **Monitorização Residencial da Pressão Arterial (MRPA):** medições 2x/dia por 7 dias com registro em tabela (data, horário e valores)
- **Modificações de estilo de vida:**
  - Restrição rigorosa de sódio
  - Evitar alimentos industrializados e embutidos
  - Atividade física: caminhada 30 minutos/dia
  - Perda ponderal
- Retorno programado em 1 semana com registro das medições pressóricas
- **Exames complementares a serem solicitados no retorno (se confirmada HAS):** perfil lipídico, glicemia, função renal, urina tipo I
- Decisão sobre terapia medicamentosa anti-hipertensiva após análise do perfil pressórico e resultados laboratoriais
- **Sinais de alerta:** orientado a procurar pronto-socorro se apresentar cefaleia intensa, dor torácica, dispneia ou turva visual

### Motivo do Encaminhamento:
[Não há indicação de encaminhamento nesta consulta]

**Data:** ${date}
**Assinatura:** _______________________

---
*Nota: Consulta de atenção primária com estratificação inicial de risco cardiovascular. Paciente em investigação diagnóstica de hipertensão arterial sistêmica com seguimento ambulatorial programado e orientações de mudanças de estilo de vida.*
`;
    },
  },
  laudo_medico: {
    '1': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># LAUDO MÉDICO

### Identificação do Médico e do Paciente
**Médico:**
- **Nome:** _______________________
- **CRM:** _______________________

**Paciente:**
- **Nome:** ${name}
- **Idade/Data de nascimento:** _______________________
- **Outros dados de identificação:** _______________________

### Descrição do Exame Realizado
- **Data do exame:** ${date}
- **Local de realização:** Consultório
- **Tipo de exame:** Consulta médica ambulatorial com exame físico geral e neurológico

### Achados/Descrição
**Queixa Principal**
Cefaleia com três dias de evolução.

**História da Doença Atual**
Paciente relata dor de cabeça de caráter contínuo há três dias, localizada predominantemente em região frontal (testa) com irradiação para região temporal bilateral. Caracteriza a dor como pulsátil, acompanhando batimentos cardíacos, com piora em momentos específicos. Refere fotofobia importante, com exacerbação da dor em ambientes com luminosidade intensa e durante uso de dispositivos eletrônicos (celular), o que tem motivado reclusão domiciliar durante o dia. Nega sintomas associados como febre, náuseas, vômitos, sintomas de vias aéreas superiores ou congestão nasal. Refere ter feito uso de paracetamol no dia anterior sem melhora significativa dos sintomas.

**História Complementar**
Paciente relata período de estresse ocupacional intenso e privação crônica de sono, com padrão de sono de aproximadamente 5 a 6 horas por noite.

**Exame Físico**
- **Dados Vitais:**
  - Pressão arterial: 120 x 80 mmHg
- **Estado Geral:**
  - Paciente corado, hidratado, em bom estado geral
- **Exame Oftalmológico:**
  - Avaliação pupilar e de motilidade ocular extrínseca: sem alterações
  - Movimentos oculares preservados em todas as direções do olhar
- **Exame da Cabeça e Pescoço:**
  - Palpação de pontos cranianos: sensibilidade dolorosa à palpação
  - Região cervical e ombros: tensão muscular evidente à palpação, com sensibilidade aumentada
- **Exame Neurológico:**
  - Sem alterações. Funções neurológicas preservadas.

### Conclusão/Impressão Diagnóstica
**Diagnóstico:** Cefaleia do tipo tensional

**Correlação Clínica:** O quadro clínico apresentado é compatível com cefaleia tensional, relacionada a fatores desencadeantes identificados como estresse ocupacional, má postura, tensão da musculatura cervical e ombros, e privação crônica de sono. O exame físico corrobora com tensão muscular cervical sem sinais de alarme neurológico.

**Conduta Terapêutica Proposta:**
- Prescrição de Naproxeno 500mg (um comprimido imediatamente, repetir após 12 horas se persistência da dor)
- Repouso domiciliar (preferencialmente 2 dias)
- Higiene do sono (mínimo 8 horas por noite)
- Redução de exposição a telas (computador/celular)
- Manutenção de ambiente com luminosidade reduzida
- Exercícios de alongamento cervical e de ombros
- **Orientação de Retorno:** Retorno imediato se não houver melhora em 3 dias ou na presença de sinais de alerta (febre, vômitos ou piora significativa da dor).

### Data e Assinatura
**Data:** ${date}
**Assinatura e Carimbo do Médico:** _______________________
`;
    },
    '2': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># LAUDO MÉDICO

### Identificação do Médico e do Paciente
**Médico:**
- **Nome:** _______________________
- **CRM:** _______________________

**Paciente:**
- **Nome:** ${name}
- **Sexo:** Feminino
- **Idade/Data de nascimento:** _______________________
- **Outros dados de identificação:** _______________________

### Descrição do Exame Realizado
- **Data do exame:** ${date}
- **Local de realização:** Consultório
- **Tipo de exame:** Consulta médica ambulatorial com coleta e análise de exame de urina tipo 1 (EAS) em caráter de urgência

### Achados/Descrição
**Queixa Principal**
Disúria (dor ao urinar) e polaciúria há 2 dias.

**História da Doença Atual**
Paciente relata início de dor ao urinar há 2 dias (início anteontem pela manhã), com piora significativa no dia seguinte. Caracteriza a dor como ardência e queimação intensa durante a micção, associada a pontadas em região suprapúbica (hipogástrio). Refere urgência miccional importante e aumento significativo da frequência urinária, estimando aproximadamente 15 a 20 micções diárias. Apresenta noctúria com despertar noturno de 3 a 4 vezes para urinar. Relata sensação de esvaziamento incompleto da bexiga, com pequeno volume urinário a cada micção. Notou alteração nas características da urina, com odor mais forte e coloração discretamente mais escura. Nega hematúria (ausência de sangue visível na urina). Nega febre, referindo apenas fadiga leve. Nega dor lombar ou em flancos.

**História Ginecológica e Antecedentes**
- Relação sexual no fim de semana passado
- Uso de anticoncepcional oral como método contraceptivo
- **História prévia de infecção urinária:** 2 episódios anteriores, sendo o último há aproximadamente 1 ano

**Resultados de Exames Laboratoriais**
**Exame de Urina Tipo 1 (EAS - Elementos Anormais e Sedimentoscopia):**
- **Leucócitos:** 2.000.000/mL (leucocitúria acentuada)
- **Nitrito:** Positivo (indicativo de presença bacteriana)
- **Demais parâmetros:** [Não detalhados na transcrição]

### Conclusão/Impressão Diagnóstica
**Diagnóstico:** Cistite aguda (infecção do trato urinário baixo)

**Correlação Clínica:** O quadro clínico apresentado é caracterizado por síndrome uretrocistítica típica, com disúria, polaciúria, urgência miccional, noctúria e dor suprapúbica. Os achados laboratoriais confirmam o diagnóstico, demonstrando leucocitúria significativa (2.000.000 leucócitos/mL) e nitrito positivo, compatíveis com infecção bacteriana da bexiga. A ausência de febre e dor lombar sugere infecção restrita ao trato urinário baixo, sem comprometimento renal (ausência de pielonefrite).

### Conduta Terapêutica Proposta:
**Tratamento Farmacológico:**
- Nitrofurantoína 100mg - 1 comprimido por via oral de 6/6 horas por 5 dias
- Administração preferencialmente junto às refeições para minimizar efeitos gastrintestinais

**Medidas Gerais e Orientações:**
- Aumento da ingesta hídrica (mínimo de 2 litros de água por dia)
- Evitar reter urina; urinar sempre que houver necessidade
- Abstinência sexual até resolução completa do quadro
- Evitar consumo de café, refrigerantes e bebidas alcoólicas durante o tratamento (potenciais irritantes vesicais)
- Manter o esquema antibiótico completo mesmo após melhora sintomática

**Evolução Esperada:** Melhora significativa dos sintomas esperada em 48 horas do início do tratamento.

**Seguimento:**
- **Exame de urina de controle:** recomendado 1 semana após término do tratamento antibiótico
- **Retorno imediato em caso de:** ausência de melhora em 48 horas, surgimento de febre, dor lombar ou hematúria

### Data e Assinatura
**Data:** ${date}
**Assinatura e Carimbo do Médico:** _______________________
`;
    },
    '3': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br># LAUDO MÉDICO

### Identificação do Médico e do Paciente
**Médico:**
- **Nome:** _______________________
- **CRM:** _______________________

**Paciente:**
- **Nome:** ${name}
- **Sexo:** Masculino
- **Idade:** 45 anos
- **Outros dados de identificação:** _______________________

### Descrição do Exame Realizado
- **Data do exame:** ${date}
- **Local de realização:** Consultório
- **Tipo de exame:** Consulta médica ambulatorial com avaliação clínica e aferição de pressão arterial

### Achados/Descrição
**Queixa Principal**
Elevação da pressão arterial detectada em medição realizada em farmácia.

**História da Doença Atual**
Paciente relata que realizou medição de pressão arterial em farmácia no dia anterior, com resultado de 160 x 100 mmHg, tendo sido orientado pelo farmacêutico a procurar avaliação médica. Refere que realiza medições ocasionais em farmácia, porém nunca havia sido alertado sobre valores elevados anteriormente. Nega ter prestado atenção específica aos valores numéricos em medições prévias. Paciente refere-se completamente assintomático, negando cefaleia, tontura, dor torácica, dispneia ou fadiga.

**Antecedentes Pessoais**
- **Estado nutricional:** Ganho ponderal nos últimos anos, estimando estar aproximadamente 10 kg acima do peso ideal
- **Atividade física:** Sedentarismo (trabalho sedentário em tempo integral)
- **Hábitos alimentares:** Consumo frequente de alimentação fora de domicílio (comida de rua) e alta ingesta de sal
- **Tabagismo:** Não tabagista
- **Etilismo:** Consumo social de bebida alcoólica aos finais de semana
- **Medicações em uso:** Nenhuma
- **Comorbidades conhecidas:** Nega diabetes mellitus ou dislipidemia (nunca investigado)
- **Seguimento médico:** Ausência de acompanhamento regular; sem check-up recente

**História Familiar**
- **Pai:** hipertensão arterial sistêmica em tratamento medicamentoso há vários anos
- **Mãe:** hipertensão arterial sistêmica diagnosticada após os 60 anos de idade

**Exame Físico**
- **Sinais Vitais:**
  - Pressão arterial em membro superior direito: 160 x 100 mmHg
  - Pressão arterial em membro superior esquerdo: 158 x 98 mmHg
- **Exame Cardiovascular:**
  - Ausculta cardíaca: sem alterações
- **Exame Respiratório:**
  - Ausculta pulmonar: murmúrio vesicular presente bilateralmente, sem ruídos adventícios
- **Estado Geral:**
  - Paciente em bom estado geral, assintomático durante a consulta

### Conclusão/Impressão Diagnóstica
**Diagnóstico Provisório:** Hipertensão Arterial Sistêmica (HAS) - a confirmar

**Correlação Clínica:** Paciente de 45 anos, sexo masculino, com história familiar positiva para hipertensão arterial (ambos os genitores), apresentando elevação significativa da pressão arterial documentada em duas aferições (farmácia: 160x100 mmHg; consultório: MSD 160x100 mmHg e MSE 158x98 mmHg). Paciente apresenta múltiplos fatores de risco cardiovascular modificáveis, incluindo sobrepeso, sedentarismo e dieta hipersódica. O diagnóstico de hipertensão arterial sistêmica requer confirmação através de múltiplas medições em momentos distintos. Paciente encontra-se assintomático, sem evidências clínicas de lesão em órgãos-alvo ao exame físico inicial.

### Conduta Proposta:
**Monitoramento:**
- **Monitorização Ambulatorial da Pressão Arterial (MAPA caseira):** aferições domiciliares de PA duas vezes ao dia (manhã e tarde/noite) durante 7 dias consecutivos, com registro detalhado (data, horário e valores)
- Retorno agendado em 1 semana com registros das medições para reavaliação

**Investigação Complementar (a ser solicitada conforme confirmação diagnóstica):**
- **Exames laboratoriais:** perfil lipídico (colesterol total e frações), glicemia de jejum, função renal (ureia e creatinina), exame de urina tipo 1
- Avaliação de possível lesão em órgãos-alvo

**Modificações do Estilo de Vida (início imediato):**
- Redução drástica da ingesta de sódio (dieta hipossódica)
- Evitar alimentos industrializados e embutidos
- Introdução progressiva de atividade física: caminhadas de pelo menos 30 minutos diários
- Redução de peso corporal
- Manutenção de etilismo em níveis moderados

**Decisão Terapêutica Farmacológica:** Aguardar confirmação diagnóstica através do monitoramento domiciliar e avaliação de exames complementares para definição sobre necessidade de terapia anti-hipertensiva.

**Orientações de Sinais de Alerta:** Paciente orientado a procurar atendimento em serviço de emergência imediatamente na presença de: cefaleia intensa, dor torácica, dispneia ou alterações visuais (visão turva).

### Data e Assinatura
**Data:** ${date}
**Assinatura e Carimbo do Médico:** _______________________

**Observações:**
- Retorno ambulatorial agendado para 1 semana
- Paciente orientado quanto à importância do registro rigoroso das medições domiciliares de pressão arterial
- Enfatizada a necessidade de início imediato das modificações de estilo de vida
`;
    },
  },
  atestado_medico: {
    '1': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br>
ATESTADO MÉDICO
IDENTIFICAÇÃO DO MÉDICO
Nome: _______________________
CRM: _______________________

IDENTIFICAÇÃO DO PACIENTE
Nome: ${name}
CPF/RG: _______________________
-------------------------------------------
Atesto para os devidos fins que o(a) Sr(a). ${name}
necessita de 2 (dois) dias de afastamento de suas atividades laborais,
a partir desta data, por motivo de doença.

Diagnóstico: Cefaleia tensional
CID-10: G44.2
□ Paciente autorizou inclusão do CID
-------------------------------------------
Local e Data: _______________________, ${date}

_____________________________
Assinatura e Carimbo do Médico
[NOME NÃO DISPONÍVEL]
CRM: [NÃO DISPONÍVEL]
`;
    },
    '2': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br>
ATESTADO MÉDICO
IDENTIFICAÇÃO DO MÉDICO
Nome: _______________________
CRM: _______________________

IDENTIFICAÇÃO DO PACIENTE
Nome: ${name}
CPF/RG: _______________________
-------------------------------------------
DIAGNÓSTICO: Cistite (Infecção Urinária)
CID-10: N30.0

EXAMES REALIZADOS:
- Exame de Urina (EAS): Leucócitos 2.000.000/campo, Nitrito: Positivo

TRATAMENTO PRESCRITO:
- Nitrofurantoína 100mg - 1 comprimido de 6/6 horas por 5 dias

RECOMENDAÇÕES:
- Ingestão hídrica abundante (2L/dia)
- Evitar relações sexuais até melhora completa
- Evitar café, refrigerantes e bebidas alcoólicas
- Não segurar urina
- Retorno se sintomas persistirem após 48h ou surgimento de febre/dor lombar/hematúria

AFASTAMENTO: [NÃO RECOMENDADO NA CONSULTA]
-------------------------------------------
Local e Data: _______________________, ${date}

_____________________________
Assinatura e Carimbo do Médico
[NOME NÃO DISPONÍVEL]
CRM: [NÃO DISPONÍVEL]
`;
    },
    '3': (historyItem) => {
        const [date, name] = historyItem.subtitle.split(' - ');
        return `<br><br><br>
ATESTADO MÉDICO
IDENTIFICAÇÃO DO MÉDICO
Nome: _______________________
CRM: _______________________

IDENTIFICAÇÃO DO PACIENTE
Nome: ${name}
Idade: 45 anos
CPF/RG: _______________________
-------------------------------------------
MOTIVO DA CONSULTA:
Pressão arterial elevada detectada em farmácia (160x100 mmHg)

DIAGNÓSTICO PRESUMPTIVO:
Hipertensão Arterial Sistêmica (em investigação)
CID-10: I10

EXAME FÍSICO:
- PA (braço direito): 160 x 100 mmHg
- PA (braço esquerdo): 158 x 98 mmHg
- Aparelho cardiovascular: sem alterações
- Aparelho respiratório: sem alterações
- Paciente assintomático

FATORES DE RISCO IDENTIFICADOS:
- História familiar positiva (pai e mãe hipertensos)
- Sobrepeso (~10kg acima do peso ideal)
- Sedentarismo
- Dieta hipersódica

CONDUTA MÉDICA:
- Monitorização domiciliar da PA: 2x/dia por 7 dias
- Modificações do estilo de vida (redução de sal, atividade física, perda de peso)
- Retorno em 1 semana para reavaliação
- Exames complementares a serem solicitados conforme evolução

AFASTAMENTO DO TRABALHO: [NÃO RECOMENDADO]
-------------------------------------------
Local e Data: _______________________, ${date}

_____________________________
Assinatura e Carimbo do Médico
[NOME NÃO DISPONÍVEL]
CRM: [NÃO DISPONÍVEL]
`;
    },
  }
};
