async function listModels() {
    const apiKey = "AIzaSyDIw9smeG23tVE4U7-bT4vjQlLF7dAePL0";
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log(`Fetching models from: ${url}`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.error("Error fetching models:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Network error:", error);
    }
}

listModels();
