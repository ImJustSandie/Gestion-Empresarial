BLOQUE 2 — INTERACTUAR CON IA 

En este bloque aprenderás a comunicarte con herramientas de inteligencia artificial generativa para obtener resultados más útiles. La calidad de una respuesta no depende únicamente del modelo: también influyen la claridad de la petición, el contexto que se proporciona, las restricciones establecidas y la forma en que se revisa el resultado. 

La meta no es memorizar una fórmula rígida para escribir prompts, sino aprender a explicar qué necesitas, aportar la información relevante y ajustar las instrucciones cuando la primera respuesta no cumple el objetivo. 

# **¿Qué es un prompt?** 

Un prompt es la entrada que proporcionas a una herramienta de IA para orientar su respuesta. Puede ser una pregunta breve, una instrucción detallada, un documento acompañado de una solicitud o una combinación de texto, imágenes y otros formatos. En lugar de pensar en el prompt como una palabra mágica, conviene entenderlo como una forma de comunicarle al sistema qué tarea debe realizar y con qué información cuenta. 

Por ejemplo, si escribes “Háblame de los ecosistemas”, la IA no sabe si buscas una definición para primaria, una explicación científica, ejemplos de Colombia o un texto para una exposición. Puede producir una respuesta correcta en términos generales, pero poco adaptada a tu necesidad. Si especificas el propósito y el público, reduces parte de esa ambigüedad. 

## **Las piezas de una instrucción** 

- Objetivo: qué necesitas conseguir, como explicar, comparar, resumir, corregir o proponer ideas. 

- Contexto: información necesaria para comprender la situación, el tema o el uso que tendrá el resultado. 

- Instrucciones: acciones concretas que debe realizar la IA y el enfoque que debe seguir. 

- Restricciones: límites de extensión, temas que debe excluir, nivel de dificultad o recursos que puede utilizar. 

- Formato de salida: la forma en que necesitas recibir el resultado, por ejemplo, una lista, una tabla, un esquema o párrafos. 

- Audiencia y criterios de calidad: quién leerá el resultado y qué características debe cumplir para ser útil. 

No todos los prompts necesitan incluir cada elemento. Para una consulta sencilla puede bastar una pregunta directa. En tareas complejas, añadir los componentes relevantes ayuda a evitar interpretaciones innecesarias. 

## **Pregunta de comprobación** 

¿Cuál de estas instrucciones ofrece información más útil para producir una respuesta adaptada a una necesidad concreta? 

- a) “Explícame la energía”. 

- b) “Escribe algo interesante sobre ciencias”. 

- c) “Explica la diferencia entre energía cinética y potencial en dos párrafos, con un ejemplo cotidiano para un estudiante de noveno grado”. 

- d) “Dame toda la información que conozcas sobre física”. 

Respuesta correcta: c) 

Por qué: define el tema, el enfoque, la extensión y el público al que va dirigida la explicación. 

## **Ejercicio práctico de observación** 

1. En tu herramienta de IA habitual, escribe: “Explícame la fotosíntesis”. 

2. En el mismo chat, escribe una nueva instrucción: “Explícame la fotosíntesis para un estudiante de séptimo grado, con una analogía cotidiana y en máximo dos párrafos”. 

3. Compara las dos respuestas y señala qué cambió en el nivel de detalle, el lenguaje y la estructura. 

¿Qué observar? la segunda petición no necesariamente contiene más datos científicos, pero sí ofrece criterios más claros sobre cómo presentar la explicación. 

# **Cómo construir prompts efectivos** 

Un prompt efectivo comunica la tarea de manera clara y específica. No existe una fórmula que garantice una respuesta perfecta, porque el resultado también depende de las capacidades y limitaciones del modelo. Sin embargo, hay prácticas que suelen facilitar la interacción. 

## **Claridad, especificidad y restricciones** 

Conviene utilizar verbos concretos y describir el resultado esperado. “Ayúdame con mi presentación” deja muchas decisiones abiertas; “propón una estructura de seis diapositivas para una exposición de cinco minutos sobre energías renovables, con una idea principal por diapositiva” define mejor la tarea. 

Las restricciones permiten ajustar la respuesta a condiciones reales. Puedes indicar una extensión, un tono, un nivel académico, un formato o elementos que deben evitarse. Es preferible que las restricciones sean compatibles entre sí: pedir una explicación exhaustiva en una sola oración puede producir un resultado superficial o contradictorio. 

## **Pedir un formato y criterios de calidad** 

Cuando el resultado debe servir para una tarea específica, explica cómo vas a evaluarlo. Si necesitas comparar opciones, pide criterios de comparación; si buscas un plan de estudio, indica el tiempo disponible y los temas; si solicitas una síntesis, aclara si debe conservar definiciones, cifras o conclusiones importantes. 

También puedes solicitar que la IA señale qué información le falta, diferencie los datos proporcionados de sus suposiciones o pregunte antes de responder cuando una decisión importante dependa de un dato desconocido. Esto no elimina los errores, pero puede hacer más visibles algunas ambigüedades. 

## **Ejemplo: de una petición vaga a una instrucción concreta** 

Petición inicial: “Hazme una rutina de estudio”. 

Petición mejorada: “Organiza un plan de estudio de lunes a viernes para preparar un examen de biología dentro de dos semanas. Tengo 45 minutos al día y debo repasar células, genética y ecosistemas. Presenta el plan en una tabla con tema, duración y actividad práctica. Deja el fin de semana libre”. 

La segunda petición aporta objetivo, contexto, restricciones y formato. Aun así, será necesario revisar si el plan es realista y si cubre los contenidos del examen. 

## **Pregunta de comprobación** 

¿Qué conviene hacer si un prompt contiene instrucciones que se contradicen, como “resume detalladamente todo el documento en una sola frase”? 

- a) Añadir más adjetivos para que la IA entienda la intención. 

- b) Aclarar cuál requisito tiene prioridad o reformular las restricciones. 

- c) Repetir exactamente la misma instrucción muchas veces. 

- d) Asumir que el modelo siempre resolverá la contradicción como esperamos. 

Respuesta correcta: b) 

Por qué: las instrucciones incompatibles obligan a priorizar una condición. Aclarar el propósito ayuda a definir un resultado razonable. 

# **Ejemplos y prompting con ejemplos** 

En ocasiones, describir una tarea no es suficiente para comunicar con precisión el estilo o el patrón que buscas. Puedes incluir uno o varios ejemplos del resultado esperado. Esta práctica se conoce como prompting con ejemplos; cuando se proporciona una instrucción sin ejemplos, suele hablarse de zeroshot, y cuando se incluyen algunos ejemplos, de few-shot. 

Imagina que necesitas clasificar comentarios de una encuesta como “positivo”, “neutral” o “negativo”. Puedes explicar las categorías, pero también mostrar ejemplos: “La actividad fue muy útil” → positivo; “La actividad empezó a las nueve” → neutral; “No entendí las instrucciones” → negativo. Después, pides clasificar comentarios nuevos usando el mismo criterio. 

Los ejemplos deben representar correctamente lo que quieres obtener. Si son ambiguos, incorrectos o contradictorios, la IA puede imitar esas inconsistencias. Además, unos pocos ejemplos orientan la respuesta, pero no garantizan que el modelo aplique la regla correctamente en todos los casos. 

## **Cuándo pueden ser útiles** 

- Para mantener un formato constante en varias respuestas. 

- Para mostrar el tono, el nivel de detalle o la estructura deseada. 

- Para clasificar o transformar información siguiendo una convención definida. 

- Para explicar cómo debe verse un resultado, siempre que los ejemplos sean pertinentes y no incluyan información que no debería compartirse. 

## **Ejercicio práctico de observación** 

4. Pide a la IA: “Clasifica estos comentarios como positivo, neutral o negativo: ‘La explicación fue clara’, ‘La clase fue el martes’, ‘La actividad fue confusa’”. 

5. Después, proporciona dos ejemplos etiquetados y solicita clasificar tres comentarios nuevos con el mismo criterio. 

6. Comprueba si las etiquetas son consistentes y modifica las instrucciones si la IA interpreta las categorías de forma distinta a la esperada. 

¿Qué observar? los ejemplos pueden reducir la ambigüedad sobre el formato y el criterio, pero aún debes revisar las clasificaciones, especialmente cuando un comentario admite varias interpretaciones. 

# **Contexto, archivos y fuentes externas** 

La IA responde a partir de los patrones aprendidos durante su entrenamiento y de la información disponible en la conversación o mediante las herramientas habilitadas. Si la tarea depende de un documento específico, no basta con asumir que el modelo conoce su contenido: es mejor proporcionar el texto o adjuntar el archivo, si la plataforma lo permite. 

Puedes aportar fragmentos de un libro, apuntes, una tabla, una imagen o instrucciones de una actividad. Luego, explica qué debe hacer la IA con ese material. Por ejemplo: “Usa únicamente el texto adjunto para resumir las tres causas principales y señala si alguna respuesta no aparece en el documento”. Debes comprobar que la herramienta haya interpretado correctamente el archivo y que el resultado realmente se apoye en él. 

Algunas aplicaciones pueden buscar información en fuentes externas y utilizarla para construir una respuesta. Una técnica relacionada es la generación aumentada por recuperación, conocida como RAG: el sistema recupera información relevante de una fuente y la incorpora al contexto que utiliza el modelo para responder. Esto no equivale a volver a entrenar el modelo. Tampoco garantiza que las fuentes recuperadas sean completas, actuales o correctas. 

## **Qué información conviene proporcionar** 

- El material necesario para resolver la tarea, evitando adjuntar documentos irrelevantes. 

- El propósito de la consulta y las partes del documento que deben priorizarse. 

- La fuente o el alcance permitido, cuando sea importante limitar la respuesta. 

- El formato final y cómo debe tratar la información que no esté disponible. 

Antes de adjuntar documentos, recuerda que debes revisar si contienen datos personales, información confidencial o material que no tienes autorización para compartir. 

## **Pregunta de comprobación** 

Si necesitas que una IA resuma un capítulo específico de tus apuntes, ¿cuál es la estrategia más adecuada? 

- a) Suponer que el modelo ya conoce exactamente el capítulo de tu curso. 

- b) Proporcionar el documento o fragmento relevante y explicar qué tipo de resumen necesitas. 

- c) Pedir que invente el contenido que falte para completar el resumen. 

- d) Repetir la pregunta sin aportar información adicional. 

Respuesta correcta: b) 

Por qué: el material aporta el contexto específico de la tarea y permite comparar la respuesta con la fuente original. 

# **Iterar: conversar, revisar y corregir** 

La interacción con IA no tiene por qué terminar después de la primera respuesta. A menudo es más efectivo tratarla como un proceso de trabajo por etapas: obtener un primer resultado, identificar qué no funciona y pedir un cambio concreto. La primera respuesta es un borrador que debe evaluarse, no una versión definitiva por defecto. 

En lugar de decir solamente “hazlo mejor”, señala qué debe cambiar. Por ejemplo: “Reduce la introducción a tres oraciones, conserva los ejemplos y utiliza un lenguaje menos técnico”. También 

puedes solicitar alternativas, pedir una explicación de una parte específica, indicar qué elementos deben mantenerse o dividir una tarea extensa en pasos pequeños. 

Es útil pedir aclaraciones antes de empezar cuando la solicitud es ambigua. Para trabajos complejos, puedes separar la planificación, la producción y la revisión. No obstante, una conversación más larga no garantiza una mejor respuesta: cada iteración debe tener un propósito claro y el resultado final debe comprobarse. 

## **Ejemplo de iteración** 

Primera instrucción: “Propón ideas para una campaña escolar de reciclaje”. 

Primera revisión: “Prioriza ideas que puedan realizarse en una semana, con materiales económicos y participación de varios cursos”. 

Segunda revisión: “Selecciona las dos ideas más viables y presenta para cada una los materiales, los pasos y una forma sencilla de medir su resultado”. 

Cada petición reduce el espacio de interpretación y convierte una idea general en una propuesta más accionable. 

## **Ejercicio práctico de observación** 

7. Pide a tu IA una propuesta breve para una actividad escolar sobre ahorro de agua. 

8. Realiza una primera iteración que imponga una restricción concreta, como un presupuesto bajo o una duración máxima de 30 minutos. 

9. Realiza una segunda iteración para obtener instrucciones paso a paso y un criterio con el que evaluar la actividad. 

10. Compara el resultado final con la primera respuesta y determina si las mejoras responden a tus restricciones. 

¿Qué observar? cada revisión debe corregir una necesidad identificable. Si la IA modifica elementos que querías conservar, indícalo expresamente. 

# **Elegir la herramienta adecuada** 

No todas las aplicaciones de IA están diseñadas para las mismas tareas. Un chatbot generalista puede servir para explicar conceptos, organizar ideas o revisar textos; un generador de imágenes está orientado a crear contenido visual; una herramienta de transcripción convierte audio en texto; y un asistente de programación puede ayudar a explicar o proponer código. Algunas plataformas reúnen varias de estas capacidades. 

Conviene distinguir entre el modelo, la aplicación y la herramienta. El modelo es el sistema que procesa o genera contenido; la aplicación es la interfaz mediante la que interactúas con él; y una herramienta es una capacidad adicional, como buscar en la web, leer archivos o ejecutar código. Una misma aplicación puede ofrecer varios modelos y herramientas, y sus funciones pueden variar según la versión o el plan. 

Para elegir, empieza por definir la tarea y el tipo de resultado que necesitas. Después, revisa si la herramienta acepta el formato de entrada adecuado, si puede realizar la operación requerida y qué límites tiene. Finalmente, evalúa el resultado y verifica cualquier dato importante. No es necesario utilizar la herramienta más compleja: la mejor elección es la que se ajusta a la tarea y a sus restricciones. 

## **Pregunta de comprobación** 

Debes crear una ilustración original para una presentación escolar. ¿Qué criterio debería orientar principalmente tu elección? 

- a) Usar siempre la misma herramienta, independientemente de la tarea. 

- b) Elegir una herramienta capaz de generar imágenes y comprobar que permita obtener el estilo y formato que necesitas. 

- c) Elegir un asistente de programación porque todas las IA realizan las mismas funciones. 

- d) Escoger la primera aplicación que aparezca, sin revisar sus capacidades. 

### Respuesta correcta: b) 

Por qué: la herramienta debe seleccionarse según el resultado que se necesita y las capacidades que realmente ofrece. 

## **Resumen del bloque** 

Un buen uso de la IA comienza con una instrucción comprensible y un objetivo definido. Añadir contexto, ejemplos, restricciones y un formato esperado puede mejorar la utilidad de la respuesta. Si el resultado no cumple lo necesario, conviene iterar con cambios concretos. Cuando la tarea depende de información particular, proporciona las fuentes pertinentes y revisa que se hayan interpretado correctamente. Por último, elige la herramienta según la tarea y mantén la responsabilidad de evaluar el resultado. 

## **Referentes para profundizar** 

- Anthropic — Prompt Engineering: documentación y recomendaciones para diseñar instrucciones. 

- Microsoft — Prompt engineering techniques: estrategias para mejorar las instrucciones. 

- Google — LLM: fine-tuning, distillation and prompt engineering: conceptos y técnicas relacionadas con la adaptación de modelos y el prompting. 

- Documentación oficial de la herramienta utilizada: capacidades disponibles, formatos admitidos, límites y tratamiento de archivos. 

