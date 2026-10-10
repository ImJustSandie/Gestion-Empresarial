# Módulo de Alfabetización en IA Generativa

## Propósito

Este documento propone la estructura temática de un módulo de
alfabetización en Inteligencia Artificial Generativa dirigido
principalmente a estudiantes. El objetivo es comprender qué son los
modelos generativos y los LLM, utilizarlos de forma efectiva, evaluar
críticamente sus respuestas, reconocer sus limitaciones y riesgos,
usarlos responsablemente y comprender conceptos actuales como RAG y
agentes.

La estructura se divide en cinco bloques:

1.  Entender la IA generativa
2.  Interactuar con IA
3.  Cuestionar la IA
4.  Usarla responsablemente
5.  Aplicarla

> Se evita profundizar en aprendizaje supervisado/no supervisado,
> regresión, clasificación, backpropagation y otros contenidos de
> machine learning tradicional que no son necesarios para la
> alfabetización básica en LLMs e IA generativa.

------------------------------------------------------------------------

# BLOQUE 1 --- ENTENDER LA IA GENERATIVA

## 1.1. ¿Qué es la Inteligencia Artificial Generativa?

### Temáticas

-   Definición de IA generativa.
-   Diferencia entre IA generativa y sistemas tradicionales de IA.
-   Generación frente a clasificación, predicción o recuperación.
-   Texto, imágenes, audio, vídeo, código y contenido multimodal.
-   Modelos fundacionales y modelos especializados.
-   Capacidades y limitaciones generales.

### Referentes

-   UNESCO --- *AI Competency Framework for Students*.
-   Stanford HAI --- *AI Index Report*.
-   IBM --- materiales introductorios sobre IA generativa.

## 1.2. ¿Qué es un modelo de lenguaje?

### Temáticas

-   Modelo de lenguaje.
-   Large Language Model (LLM).
-   Predicción de tokens.
-   Probabilidad y generación de texto.
-   Contexto.
-   Parámetros.
-   Foundation models.
-   Entrenamiento e inferencia.
-   Por qué un LLM puede producir texto coherente sin funcionar como una
    base de datos convencional.

### Referentes

-   Google --- *Introduction to Large Language Models*.
-   Google --- *What's a Large Language Model?*.
-   Microsoft --- conceptos de prompt engineering.

## 1.3. Tokens y contexto

### Temáticas

-   Qué es un token.
-   Palabras, subpalabras y caracteres.
-   Tokenización.
-   Relación entre tokens y longitud.
-   Ventana de contexto.
-   Contexto de entrada y contexto generado.
-   Límites de contexto.

### Actividad sugerida

Mostrar un texto y su tokenización de forma visual y comparar el consumo
de contexto de distintos prompts.

### Referentes

-   Google --- *Introduction to Large Language Models*.
-   Google --- *What's a Large Language Model?*.
-   Documentación oficial de los proveedores utilizados.

## 1.4. ¿Cómo se entrenan los modelos generativos?

### Temáticas

-   Datos de entrenamiento.
-   Corpus.
-   Preentrenamiento.
-   Patrones aprendidos.
-   Parámetros.
-   Inferencia.
-   Fine-tuning / ajuste fino.
-   Instrucción y alineación.
-   Modelo vs. prompt.

### No es necesario profundizar en

-   Descenso del gradiente.
-   Backpropagation.
-   Arquitecturas neuronales completas.
-   Clasificación y regresión.
-   Implementación de un modelo desde cero.

### Referentes

-   Google --- *Introduction to Large Language Models*.
-   Google --- *LLM: Fine-tuning, distillation and prompt engineering*.
-   Google --- *Machine Learning Crash Course*.

## 1.5. Datos, calidad y sesgos de los datos

### Temáticas

-   Procedencia de los datos.
-   Calidad.
-   Datos incompletos o incorrectos.
-   Datos sesgados.
-   Representación desigual.
-   Datos sintéticos.
-   Relación entre datos y comportamiento del modelo.
-   Conocimiento aprendido vs. información proporcionada posteriormente.

### Referentes

-   Google --- *Datasets and Generalization*.
-   UNESCO --- *AI Competency Framework for Students*.
-   Stanford HAI --- *AI Index, Responsible AI*.

## 1.6. Transformers y atención --- nivel conceptual

### Temáticas

-   Qué es un Transformer.
-   Atención / self-attention.
-   Relación entre palabras y contexto.
-   Por qué la atención permite relacionar diferentes partes de una
    secuencia.

### Alcance

Explicación conceptual. No es necesario enseñar matrices, ecuaciones ni
implementación matemática.

### Referentes

-   Google --- *What's a Large Language Model?*.
-   Vaswani et al. --- *Attention Is All You Need* (2017).

## 1.7. Multimodalidad

### Temáticas

-   Texto.
-   Visión.
-   Audio.
-   Vídeo.
-   Código.
-   Modelos multimodales.
-   Entrada y salida multimodal.
-   Interpretación vs. generación.
-   Limitaciones de la percepción multimodal.

### Referentes

-   Documentación oficial de modelos multimodales.
-   Stanford HAI --- *AI Index Report*.

------------------------------------------------------------------------

# BLOQUE 2 --- INTERACTUAR CON IA

## 2.1. ¿Qué es un prompt?

### Temáticas

-   Prompt como instrucción o entrada.
-   Objetivo.
-   Contexto.
-   Instrucciones.
-   Restricciones.
-   Formato de salida.
-   Audiencia.
-   Criterios de calidad.
-   Pregunta vs. instrucción especificada.

### Referentes

-   Microsoft --- *Prompt engineering techniques*.
-   Anthropic --- *Prompting best practices*.
-   Documentación oficial del proveedor utilizado.

## 2.2. Construcción de prompts efectivos

### Temáticas

-   Claridad.
-   Contexto.
-   Especificidad.
-   Restricciones.
-   Ejemplos.
-   Formato.
-   Criterios de evaluación.
-   Iteración y refinamiento.

### Actividades

-   Mejorar un prompt deficiente.
-   Comparar dos prompts.
-   Predecir cuál producirá mejores resultados.
-   Reparar un prompt contradictorio.
-   Crear un prompt desde cero.

### Referentes

-   Anthropic --- *Prompting best practices*.
-   Microsoft --- *Prompt engineering techniques*.
-   Google --- *LLM fine-tuning, distillation and prompt engineering*.

## 2.3. Few-shot prompting y ejemplos

### Temáticas

-   Zero-shot.
-   Few-shot.
-   Proporcionar ejemplos.
-   Calidad de los ejemplos.
-   Ejemplos contradictorios.

### Referentes

-   Google --- *LLM: Fine-tuning, distillation and prompt engineering*.
-   Anthropic --- *Prompting best practices*.

## 2.4. Contexto, archivos y fuentes externas

### Temáticas

-   Contexto directo.
-   Documentos.
-   Tablas.
-   Imágenes.
-   Información recuperada externamente.
-   Introducción conceptual a RAG.
-   RAG vs. entrenamiento.
-   Cuándo proporcionar documentos.

### Referentes

-   Documentación técnica de proveedores.
-   Anthropic --- *Building Effective Agents*.

## 2.5. Iteración y conversación

### Temáticas

-   Pedir aclaraciones.
-   Revisar.
-   Corregir.
-   Cambiar restricciones.
-   Solicitar alternativas.
-   Criticar una respuesta anterior.
-   Dividir problemas complejos.

### Actividad

Dar un objetivo y limitar al estudiante a tres iteraciones para mejorar
el resultado.

### Referentes

-   Anthropic --- *Prompting best practices*.
-   Anthropic --- *Building Effective Agents*.

## 2.6. Uso de herramientas de IA

### Temáticas

-   Chatbots.
-   Generadores de imágenes.
-   Audio.
-   Vídeo.
-   Asistentes de programación.
-   Análisis de documentos.
-   Búsqueda.
-   Diferencia entre modelo, aplicación y herramienta.
-   Selección de herramienta según la tarea.

### Actividad

**Elige la herramienta:** presentar una situación y varias herramientas
posibles.

------------------------------------------------------------------------

# BLOQUE 3 --- CUESTIONAR LA IA

## 3.1. Alucinaciones

### Temáticas

-   Definición.
-   Información falsa pero plausible.
-   Referencias inventadas.
-   Personas, estudios o eventos inexistentes.
-   Errores numéricos.
-   Errores de razonamiento.
-   Por qué una respuesta puede sonar segura y ser incorrecta.
-   Factores que aumentan el riesgo.
-   Reducción, pero no eliminación, del riesgo.

### Referentes

-   IBM --- *What are AI hallucinations?*.
-   Google --- *Introduction to Large Language Models*.
-   NIST --- *AI Risk Management Framework / Generative AI Profile*.

## 3.2. Verificación de información

### Temáticas

-   Respuesta plausible vs. respuesta verificada.
-   Verificación de afirmaciones.
-   Fuentes primarias y secundarias.
-   Buscar evidencia.
-   Comprobar referencias.
-   Contrastar varias fuentes.
-   Verificar fechas y cifras.
-   No delegar completamente la investigación.

### Actividad

**Detector de alucinaciones:** clasificar afirmaciones como correcta,
incorrecta o necesita verificación.

## 3.3. Sesgos en modelos generativos

### Temáticas

-   Qué es un sesgo.
-   Sesgos derivados de datos.
-   Sesgos culturales y lingüísticos.
-   Estereotipos.
-   Representación.
-   Objetividad aparente vs. objetividad real.
-   Cómo detectar posibles sesgos.

### Referentes

-   UNESCO --- *AI Competency Framework for Students*.
-   Google --- *ML Fairness*.
-   Stanford HAI --- *AI Index, Responsible AI*.

## 3.4. Incertidumbre y confianza

### Temáticas

-   Seguridad del lenguaje vs. certeza.
-   Respuestas ambiguas.
-   Información incompleta.
-   Preguntas fuera del alcance.
-   Pedir limitaciones.
-   Cuándo buscar una fuente externa.

### Actividad

Presentar respuestas con distintos niveles de confianza aparente y
determinar cuáles requieren verificación.

## 3.5. Evaluación de contenido generado

### Texto

-   Exactitud.
-   Relevancia.
-   Coherencia.
-   Cumplimiento de instrucciones.
-   Calidad de fuentes.

### Código

-   Correctitud.
-   Seguridad.
-   Mantenibilidad.
-   Tests.
-   Dependencias.
-   Comprensión antes de usar.

### Imágenes

-   Anatomía.
-   Texto.
-   Detalles.
-   Consistencia.
-   Derechos de uso.

### Actividad

**¿Cuál respuesta elegirías?**

## 3.6. Límites de la IA generativa

### Temáticas

-   Información desactualizada.
-   Falta de contexto.
-   Ambigüedad.
-   Errores.
-   Dependencia.
-   Costos.
-   Latencia.
-   Límites de contexto.
-   Limitaciones multimodales.
-   Diferencias entre modelos.

------------------------------------------------------------------------

# BLOQUE 4 --- USARLA RESPONSABLEMENTE

## 4.1. Privacidad y datos personales

### Temáticas

-   Datos personales.
-   Información sensible.
-   Información académica.
-   Información confidencial.
-   Qué no introducir en herramientas de IA.
-   Riesgos de subir documentos.
-   Cuentas y permisos.
-   Herramientas personales vs. institucionales.
-   Políticas de privacidad y retención.

### Actividad

**¿Qué le darías a la IA?**

Clasificar información en: - Puede compartirse. - Requiere precaución. -
No debería compartirse.

## 4.2. Seguridad en IA generativa

### Temáticas

-   Prompt injection.
-   Instrucciones maliciosas.
-   Filtración de información.
-   Output handling.
-   Uso inseguro de herramientas.
-   Riesgos de agentes con permisos.
-   Exceso de autonomía.

### Referentes

-   OWASP --- *Top 10 for LLM Applications*.
-   OWASP GenAI --- *Top 10 for LLM and GenAI*.
-   NIST --- *AI Risk Management Framework / Generative AI Profile*.

## 4.3. Propiedad intelectual y copyright

### Temáticas

-   Copyright.
-   Plagio.
-   Autoría.
-   Atribución.
-   Contenido generado por IA.
-   Material protegido.
-   Licencias.
-   Responsabilidad del usuario.
-   Políticas educativas.

### Nota

Las reglas legales varían según jurisdicción. El contenido debe evitar
presentar una única regla universal.

### Referentes

-   WIPO --- materiales sobre AI and Intellectual Property.
-   Legislación y organismos de propiedad intelectual relevantes para
    Colombia.
-   Políticas institucionales.

## 4.4. Uso académico de IA

### Temáticas

-   IA para aprender.
-   IA como tutor.
-   Brainstorming.
-   Explicación.
-   Retroalimentación.
-   Generación de ejercicios.
-   Traducción.
-   Generación de trabajos.
-   Declaración del uso de IA.
-   Políticas institucionales.
-   Integridad académica.

### Idea central

**Usar IA para aprender** no es lo mismo que **usar IA para evitar
aprender**.

### Referentes

-   UNESCO --- *Guidance for Generative AI in Education and Research*.
-   UNESCO --- *AI Competency Framework for Students*.
-   Políticas de IA de universidades.

## 4.5. Dependencia y pensamiento crítico

### Temáticas

-   Automatización excesiva.
-   Delegación del razonamiento.
-   Sesgo de automatización.
-   Dependencia.
-   Mantener criterio propio.
-   IA como apoyo y no como sustituto.

### Actividad

Comparar dos estrategias de estudio y determinar cuál favorece más el
aprendizaje.

## 4.6. Transparencia y responsabilidad

### Temáticas

-   Declarar el uso de IA cuando corresponda.
-   Responsabilidad humana.
-   Revisar antes de publicar.
-   Trazabilidad.
-   Asistencia vs. delegación.
-   Decisiones que deben permanecer bajo supervisión humana.

### Referentes

-   UNESCO --- *AI Competency Framework for Students*.
-   NIST --- *AI Risk Management Framework*.

------------------------------------------------------------------------

# BLOQUE 5 --- APLICAR LA IA

## 5.1. IA como herramienta de aprendizaje

### Aplicaciones

-   Tutor personalizado.
-   Explicaciones alternativas.
-   Preguntas de práctica.
-   Flashcards.
-   Simulaciones.
-   Retroalimentación.
-   Resúmenes.
-   Preparación para exámenes.
-   Brainstorming.
-   Traducción.
-   Adaptación del nivel.

### Referentes

-   UNESCO --- *Guidance for Generative AI in Education and Research*.
-   UNESCO --- *AI Competency Framework for Students*.
-   Stanford HAI --- *AI Index, Education*.

## 5.2. IA para investigación

### Temáticas

-   Preguntas de investigación.
-   Exploración inicial.
-   Organización.
-   Resumen.
-   Comparación.
-   Identificación de fuentes.
-   Verificación de referencias.
-   Límites de la IA en investigación.

### Regla

La IA puede ayudar a encontrar y organizar información, pero no
sustituye la comprobación de las fuentes originales.

## 5.3. IA para escritura y comunicación

### Aplicaciones

-   Brainstorming.
-   Estructuración.
-   Revisión.
-   Corrección.
-   Adaptación de tono.
-   Traducción.
-   Resumen.
-   Transformación de formatos.

### Riesgos

-   Homogeneización.
-   Pérdida de voz personal.
-   Información inventada.
-   Dependencia.

## 5.4. IA para programación

### Aplicaciones

-   Explicar código.
-   Generar funciones.
-   Encontrar errores.
-   Refactorizar.
-   Generar tests.
-   Documentar.
-   Explorar APIs.
-   Aprender nuevos lenguajes.

### Competencias

-   Leer código generado.
-   Ejecutarlo en entorno seguro.
-   Probarlo.
-   Revisar dependencias.
-   Verificar seguridad.
-   Comprender antes de integrar.

### Referentes

-   Documentación de asistentes de programación.
-   Anthropic --- *Building Effective Agents*.

## 5.5. IA generativa para creación multimedia

### Texto

-   Guiones.
-   Ideas.
-   Diálogos.
-   Descripciones.

### Imagen

-   Concept art.
-   Storyboards.
-   Variaciones.
-   Referencias.

### Audio

-   Música.
-   Voz.
-   Efectos.

### Vídeo

-   Storyboards.
-   Animación.
-   Edición asistida.

### Competencias

-   Especificar intención.
-   Evaluar resultados.
-   Iterar.
-   Mantener coherencia.
-   Respetar derechos y licencias.

## 5.6. Elegir la herramienta adecuada

### Temáticas

-   Problema → capacidad necesaria → herramienta.
-   LLM generalista.
-   Modelo especializado.
-   Generador de imágenes.
-   Búsqueda.
-   Análisis de documentos.
-   Asistente de programación.
-   Herramientas multimodales.
-   Modelos locales vs. nube.

### Actividad

**Elige tu herramienta:** seleccionar una herramienta, justificarla y
determinar qué resultado debe verificarse.

## 5.7. RAG y uso de información externa

### Temáticas

-   Conocimiento limitado del modelo.
-   Retrieval-Augmented Generation.
-   Recuperación.
-   Generación basada en documentos.
-   Fuentes externas.
-   RAG vs. entrenamiento.
-   Ventajas y limitaciones.
-   Riesgos de recuperar información incorrecta.

### Alcance

Conceptual; no es necesario construir un sistema RAG.

### Referente

-   Anthropic --- *Building Effective Agents*.

## 5.8. ¿Qué es un agente de IA?

### Temáticas

-   Chatbot vs. agente.
-   LLM aumentado.
-   Herramientas.
-   Memoria.
-   Recuperación.
-   Planificación.
-   Ejecución.
-   Observación.
-   Autonomía.
-   Workflows vs. agentes.
-   Human-in-the-loop.
-   Riesgos de delegar acciones.

### Actividad

Determinar si una tarea requiere un chatbot, un workflow o un agente.

### Referentes

-   Anthropic --- *Building Effective Agents*.
-   OWASP --- *Top 10 for LLM and GenAI*.
-   Stanford HAI --- *AI Index Report*.

## 5.9. Automatización y colaboración humano-IA

### Temáticas

-   IA como asistente.
-   Human-in-the-loop.
-   Automatización parcial.
-   Automatización completa.
-   Delegación.
-   Supervisión.
-   Verificación.
-   División de responsabilidades.
-   Cuándo no automatizar.

### Actividad final

**Diseña tu flujo de trabajo:** decidir qué hace la IA, qué hace el
estudiante, qué se proporciona, qué se verifica y qué decisiones no se
delegan.
------------------------------------------------------------------------

# PROGRESIÓN DE COMPETENCIAS

Inspirada en la progresión de UNESCO: **comprender → aplicar → crear**.

## Nivel 1 --- Explorador

-   Reconoce conceptos básicos.
-   Identifica tipos de IA generativa.
-   Distingue LLM, herramienta y aplicación.
-   Reconoce categorías de herramientas.

## Nivel 2 --- Usuario

-   Construye prompts.
-   Proporciona contexto.
-   Utiliza herramientas.
-   Itera sobre resultados.

## Nivel 3 --- Estratega

-   Selecciona herramientas.
-   Divide problemas.
-   Combina herramientas.
-   Diseña flujos de trabajo.

## Nivel 4 --- Evaluador

-   Detecta alucinaciones.
-   Verifica información.
-   Reconoce sesgos.
-   Identifica riesgos.
-   Evalúa resultados.

## Nivel 5 --- Creador

-   Diseña soluciones apoyadas en IA.
-   Combina modelos y herramientas.
-   Integra IA en flujos de trabajo.
-   Determina qué debe permanecer bajo control humano.

------------------------------------------------------------------------

# REFERENTES PRINCIPALES

1.  **UNESCO --- AI Competency Framework for Students**
    -   Competencias, pensamiento crítico, ética y progresión educativa.
2.  **UNESCO --- Guidance for Generative AI in Education and Research**
    -   Uso educativo responsable de IA generativa.
3.  **Stanford HAI --- AI Index Report**
    -   Adopción, capacidades, riesgos y evolución del ecosistema.
4.  **Google --- Machine Learning Crash Course: Large Language Models**
    -   Tokens, LLM, Transformers, contexto y fine-tuning.
5.  **Microsoft --- Prompt Engineering**
    -   Diseño de prompts.
6.  **Anthropic --- Prompting Best Practices**
    -   Técnicas de prompting.
7.  **Anthropic --- Building Effective Agents**
    -   Herramientas, RAG conceptual, workflows y agentes.
8.  **OWASP --- Top 10 for LLM Applications / GenAI**
    -   Seguridad, prompt injection, filtración, excessive agency y
        otros riesgos.
9.  **NIST --- AI Risk Management Framework y Generative AI Profile**
    -   Gestión de riesgos de IA generativa.
10. **IBM --- AI Hallucinations**
    -   Alucinaciones y generación de información falsa.
11. **Vaswani et al. --- Attention Is All You Need (2017)**
    -   Referencia académica fundamental sobre Transformers.

------------------------------------------------------------------------

# CRITERIO PARA CREAR CADA LECCIÓN

Cada temática puede seguir una plantilla común:

1.  Concepto.
2.  ¿Por qué importa?
3.  Explicación sencilla.
4.  Ejemplo cotidiano.
5.  Ejemplo académico.
6.  Uso correcto.
7.  Uso incorrecto.
8.  Error frecuente.
9.  Actividad interactiva.
10. Pregunta de comprobación.
11. Mini reto.
12. Resumen.
13. Referentes para profundizar.

Los agentes utilizados para generar contenido deberían recibir esta
estructura como requisito y utilizar los referentes como fuentes de
consulta, evitando inventar ejemplos, datos o referencias.

------------------------------------------------------------------------

# TEMÁTICAS PRIORITARIAS PARA EL MVP

## Bloque 1

-   IA generativa.
-   LLM.
-   Tokens.
-   Contexto.
-   Datos y entrenamiento.
-   Entrenamiento vs. inferencia.
-   Multimodalidad.

## Bloque 2

-   Prompts.
-   Contexto e instrucciones.
-   Restricciones y formato.
-   Few-shot.
-   Iteración.
-   Selección de herramientas.

## Bloque 3

-   Alucinaciones.
-   Verificación.
-   Sesgos.
-   Evaluación de respuestas.
-   Limitaciones de los modelos.

## Bloque 4

-   Privacidad.
-   Seguridad.
-   Copyright y autoría.
-   Uso académico.
-   Dependencia y pensamiento crítico.
-   Transparencia.

## Bloque 5

-   IA para aprendizaje.
-   IA para investigación.
-   IA para escritura.
-   IA para programación.
-   IA para creación multimedia.
-   Selección de herramientas.
-   RAG conceptual.
-   Agentes.
-   Colaboración humano-IA.
