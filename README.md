# PayrollPro

PayrollPro is a comprehensive payroll management system designed to simplify payroll processes for businesses of all sizes. This system offers a range of features to ensure timely and accurate payments, employee self-service, and compliance management.

This application is available online: https://www.paymansys.org

## Features

- **Automated Payroll**: Streamline your payroll process with our automated system, ensuring timely and accurate payments.
- **Employee Self-Service**: Empower your employees with self-service access to their payroll information and documents.
- **Compliance Management**: Stay compliant with the latest regulations and standards with our comprehensive compliance tools.

## Project Structure

The project is organized as follows:

```
.
├── app.ts
├── build/
├── custom_scripts/
├── lib/
├── node_modules/
├── public/
│   ├── css/
│   ├── images/
│   ├── js/
├── src/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
├── views/
│   ├── auth/
│   ├── common/
│   ├── employee/
│   ├── includes/
│   ├── manager/
│   ├── error/
├── .dcignore
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/bpajor/pay-man-sys.git
    cd pay-man-sys
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Set up environment variables:
    Create a `.env` file in the root directory and add the following variables:
    ```env
    TYPEORM_HOST=localhost
    TYPEORM_PORT=5432
    TYPEORM_USERNAME=your_username
    TYPEORM_PASSWORD=your_password
    TYPEORM_DATABASE=pay_man_sys_local
    TYPEORM_SYNCHRONIZE=true
    TYPEORM_LOGGING=true
    NODE_ENVIRONMENT=local
    BASE_URL=http://localhost:8000
    REDIS_URL=your_redis_url
    SESSION_SECRET=array_of_secrets_for_session
    GMAIL_EMAIL=paymansys@gmail.com
    GMAIL_APP_PASSWORD=vylwkycjfhdvjlmu
    ```

4. Run the project with the following command:
```
npm run dev
```
    

## Usage

- **Employee Dashboard**: Employees can view their personal information, earnings, leave balances, and mark attendance.
- **Manager Dashboard**: Managers can view employee details, handle join requests, generate financial reports, and manage company settings.

## Scripts

- `npm run build`: Compiles the TypeScript code.
- `npm start`: Builds the project and starts the application.
- `npm run dev`: Starts the application in development mode with hot-reloading.
- `npm run seed:config`: Configures the database seeding.
- `npm run seed:run`: Runs the database seeding.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Open a pull request.

## License

This project is licensed under the MIT License.

## Contact

For any inquiries or support, please contact bpajor.
