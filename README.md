# Digital Wellness Portal

## Overview
The Digital Wellness Portal is a web-based application designed to help users track and improve their digital well-being. By logging daily entries, reflecting on their habits, and analyzing trends, users can gain insights into their mood and screen time patterns. The system encourages mindfulness and intentionality in digital usage.

## Features
- **Daily Check-ins**: Log your mood and screen time daily.
- **Reflective Prompts**: Receive prompts to reflect on your intentions and habits.
- **Trend Analysis**: Visualize mood and screen time trends over the past week.
- **Weekly Wellness Summary**: Generate a summary report of your digital wellness.
- **Nudges and Reminders**: Get reminders to log entries and reflect.
- **Secure Authentication**: User authentication with JWT.

## How to Set Up

### Prerequisites
- Node.js (v16 or higher)
- SQLite3
- Git

### Installation Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/digital-wellness-portal.git
   cd digital-wellness-portal
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up the Database**:
   - Ensure SQLite3 is installed.
   - Run the database migration script:
     ```bash
     node scripts/migrate.js
     ```

4. **Seed the Database** (Optional):
   - Populate the database with sample data:
     ```bash
     bash seed-week-smart.sh
     ```

5. **Start the Server**:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`.

## Limitations
- **Single User**: The system currently supports only one user at a time.
- **Data Storage**: Data is stored locally in SQLite, which may not be suitable for large-scale deployments.
- **Mobile Responsiveness**: While functional on mobile devices, the UI is optimized for desktop use.
- **Insights**: Correlation insights are basic and may not capture complex relationships.

## Future Enhancements

While the current system achieves its goal of promoting reflection and awareness of smartphone habits, there are several potential enhancements for future iterations:

### 1. Enhanced Data Analytics and Insights
- Introduce a data analytics module to visualize user progress over time.
- Provide visual trends, graphs, and behavioral summaries to help users understand their habits.
- Incorporate lightweight AI to detect patterns and correlations, such as the relationship between phone use and emotional states.

### 2. AI-Powered Personalization and Recommendations
- Use natural language processing to tailor reflective prompts based on user responses.
- Offer personalized mindfulness suggestions or motivational messages.
- Summarize user reflections over time, highlighting recurring themes or progress.

### 3. Improved Accessibility, Responsiveness, and User Interface
- Refine the interface to better adapt to different screen sizes and devices.
- Ensure accessibility standards are met, including fonts, contrast, and interaction elements.
- Add features like dark mode, customizable themes, and adjustable font sizes.

### 4. Integration with Mobile Platforms and APIs
- Develop a mobile app version for seamless integration into daily routines.
- Use mobile notifications to remind users to reflect or log entries.
- Integrate with external APIs (e.g., Google Fit, Apple Health) to provide contextual wellness insights.

### 5. Security, Authentication, and Data Privacy
- Strengthen security with encrypted data storage, password protection, and optional biometric login.
- Ensure user privacy and data protection as a primary design pillar.

These enhancements aim to evolve the system into a more intelligent, adaptive, and user-centered platform, deepening user engagement and long-term impact.

## Technologies Used

The project is built using the following key technologies:

- **Node.js**: JavaScript runtime for building the backend.
- **Express.js**: Web framework for handling routes and middleware.
- **SQLite3**: Lightweight database for storing user data and entries.
- **Body-Parser**: Middleware for parsing JSON request bodies.
- **JSON Web Token (JWT)**: For secure user authentication.
- **Bcrypt.js**: For hashing and verifying passwords.
- **Multer**: For handling file uploads (e.g., user photos).

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## Acknowledgments
- Chart.js for data visualization.
- Node.js and Express.js for backend development.
- SQLite for lightweight database management.