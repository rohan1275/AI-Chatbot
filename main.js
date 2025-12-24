document.addEventListener('DOMContentLoaded', () => {
    const goalForm = document.getElementById('goalForm');
    const goalsContainer = document.getElementById('goalsContainer');
    const chatMessages = document.getElementById('chatMessages');
    const userMessageInput = document.getElementById('userMessage');
    const sendMessageButton = document.getElementById('sendMessage');

    // Load existing goals
    loadGoals();

    // Handle goal form submission
    goalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const goal = {
            name: document.getElementById('goalName').value,
            targetAmount: parseFloat(document.getElementById('targetAmount').value),
            currentAmount: parseFloat(document.getElementById('currentAmount').value),
            deadline: document.getElementById('deadline').value
        };

        try {
            const submitButton = document.querySelector('#goalForm button[type="submit"]');
            const isEditing = submitButton.textContent === 'Update Goal';
            
            if (isEditing) {
                // Update existing goal
                const index = goalForm.dataset.editIndex;
                const response = await fetch(`/api/goals/${index}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(goal)
                });

                if (response.ok) {
                    // Reset form and button text
                    goalForm.reset();
                    submitButton.textContent = 'Add Goal';
                    delete goalForm.dataset.editIndex;
                }
            } else {
                // Add new goal
                const response = await fetch('/api/goals', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(goal)
                });
                
                if (response.ok) {
                    goalForm.reset();
                }
            }
            
            loadGoals();
        } catch (error) {
            console.error('Error saving goal:', error);
        }
    });

    // Load goals from server
    async function loadGoals() {
        try {
            const response = await fetch('/api/goals');
            const goals = await response.json();
            
            goalsContainer.innerHTML = '';
            goals.forEach((goal, index) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const goalCard = document.createElement('div');
                goalCard.className = 'goal-card';
                goalCard.innerHTML = `
                    <div class="goal-header">
                        <h3>${goal.name}</h3>
                        <div class="goal-actions">
                            <button class="edit-goal" data-index="${index}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-goal" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p>Target: $${goal.targetAmount}</p>
                    <p>Current: $${goal.currentAmount}</p>
                    <p>Deadline: ${goal.deadline}</p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progress}%"></div>
                    </div>
                `;
                goalsContainer.appendChild(goalCard);
            });

            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-goal').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const index = e.target.closest('.delete-goal').dataset.index;
                    if (confirm('Are you sure you want to delete this goal?')) {
                        try {
                            const response = await fetch(`/api/goals/${index}`, {
                                method: 'DELETE'
                            });
                            if (response.ok) {
                                loadGoals();
                            }
                        } catch (error) {
                            console.error('Error deleting goal:', error);
                        }
                    }
                });
            });

            // Add event listeners to edit buttons
            document.querySelectorAll('.edit-goal').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const index = e.target.closest('.edit-goal').dataset.index;
                    const goal = goals[index];
                    
                    // Fill the form with the goal data
                    document.getElementById('goalName').value = goal.name;
                    document.getElementById('targetAmount').value = goal.targetAmount;
                    document.getElementById('currentAmount').value = goal.currentAmount;
                    document.getElementById('deadline').value = goal.deadline;
                    
                    // Change the form button text
                    const submitButton = document.querySelector('#goalForm button[type="submit"]');
                    submitButton.textContent = 'Update Goal';
                    
                    // Store the index in the form for later use
                    goalForm.dataset.editIndex = index;
                });
            });
        } catch (error) {
            console.error('Error loading goals:', error);
        }
    }

    // Handle chatbot messages
    sendMessageButton.addEventListener('click', sendMessage);
    userMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = userMessageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessageToChat('user', message);
        userMessageInput.value = '';

        try {
            // Get current goals data
            const goalsResponse = await fetch('/api/goals');
            const goals = await goalsResponse.json();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message,
                    goals: goals // Include goals data in the request
                })
            });

            const data = await response.json();
            // Convert newlines to <br> tags for proper display
            const formattedResponse = data.response.replace(/\n/g, '<br>');
            addMessageToChat('bot', formattedResponse);
        } catch (error) {
            console.error('Error sending message:', error);
            addMessageToChat('bot', 'Sorry, I encountered an error. Please try again.');
        }
    }

    function addMessageToChat(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        // Use innerHTML for bot messages to render <br> tags
        if (sender === 'bot') {
            messageDiv.innerHTML = message;
        } else {
            messageDiv.textContent = message;
        }
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}); 