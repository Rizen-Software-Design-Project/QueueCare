
# Sprint Retrospective

## Sprint 1

**Tlou Kgatla**

- What went well: During this sprint, several aspects of the project progressed well. I successfully developed the welcome page, sign-in page, and dashboard, and ensured that the clinic search feature was properly integrated with the dashboard. For each of these components, I focused on using simple and semantic HTML elements, which improved both structure and readability. In addition, my teammates contributed effectively to their assigned tasks. They were able to design and implement the database, connect it to the authentication process, enable successful user sign-in, deploy the application to Azure, and develop the clinic search functionality. Overall, there was clear technical progress and collaboration across different parts of the system.

- What went badly:However, there were also challenges during the sprint. Initially, it was difficult to properly set up the project files and clearly distribute responsibilities among team members, especially for more complex features. Later in the sprint, when progress had stabilized, one team member proceeded to implement their task without prior discussion or approval from the group. This resulted in critical parts of the system,specifically the sign-in, dashboard, and clinic search features,being overwritten or lost. As a result, three of us had to spend approximately six hours restoring and fixing the affected functionality, which slowed down overall progress.

- How to improve:To improve future sprints, the team needs to strengthen communication and coordination. Establishing clearer processes for decision-making, code integration, and change approval will help prevent similar issues and ensure smoother collaboration.

**Nthabiseng Lefopana**

- What went well:During this sprint, I worked on integrating South African healthcare data into our system so users can easily find nearby clinics. I successfully sourced a dataset of clinics, cleaned and structured it by removing duplicates, fixing missing information, and standardising names and addresses. I also enhanced the dataset by adding a “district” column to support better grouping and filtering. Using the Google Maps API, I converted clinic addresses into latitude and longitude coordinates and then uploaded the processed data into Supabase. Additionally, I implemented a distance-calculation function that allows users to search for clinics within a chosen radius, along with filtering and search features. Overall, I was able to combine multiple tools into a functional system and gained valuable experience working with geolocation data.

- What went badly:There were several challenges during the sprint. Since it was my first time working with some of these technologies, it took time to understand how they interact, which slowed my progress. Data cleaning was more time-consuming than expected, especially when errors required rework. The Google Maps API also presented difficulties, as some addresses returned inaccurate coordinates and I had to manage API usage limits. In addition, team communication could have been improved, as tasks were not always clearly defined, leading to some inefficiencies.

- How to improve:From this experience, I learned the importance of properly planning and structuring data early on, as well as testing features incrementally to catch issues sooner. Moving forward, I aim to improve my communication within the team to ensure better coordination and clearer task allocation. This will help reduce overlap, avoid delays, and make the development process more efficient in future sprints.

**Somnotho Mzolo**

- What went well:During this initial sprint on the QueueCare platform, I was responsible for developing the booking and appointment system. The implementation of the core backend functionality was straightforward and manageable, and building the logic for handling bookings and appointments did not present major technical challenges. I was able to successfully test and validate the system using Postman, confirming that the backend works as expected. Overall, the backend component is functional and ready for integration.

- What went badly:One of the main challenges was defining the appropriate data fields, especially with frontend integration in mind. Determining what data the frontend required and structuring it correctly took longer than expected. Additionally, working with React and JavaScript introduced a steep learning curve, making integration more difficult and slowing progress. There was also team misalignment regarding the database, as the initial design I created was later modified by another developer. This caused inconsistencies, conflicts, and rework—particularly affecting authentication and login functionality. Due to these challenges and time constraints, I was unable to implement the frontend for the booking system.

- How to improve:Moving forward, clearer communication and early agreement on shared components like the database schema will be essential to avoid conflicts and unnecessary rework. Better alignment between frontend and backend requirements at the start of the sprint will also improve efficiency. In addition, I plan to strengthen my React skills so I can contribute more effectively to frontend integration and overall full-stack development in future sprints.

**Hlulani Baloyi**

- What went well:My work forms the entry point of the entire system. Without the authentication, Users’ 
accounts, data and details would not be secure. Without profile creation no other feature can 
function like booking appointments, joining queues,  notifying users because how would one 
identify the user. The backend API plays as the middleman between React and Supabase.In this sprint, I took on the authentication and the backend infrastructure of the QueueCare 
system. With the authentication, I implemented a phone login system, as well as, a Google 
login using Firebase Authentication.The phone login included things like reCAPTCHA, OTP 
confirmation and Google signin through popup.I also implemented an endpoint that checks if 
a South African ID is valid given the sex, date of birth and if someone is a citizen or not. It 
also includes Luhn Checksum. In addition, I built a Rest API using Express with endpoints  
that prevents duplicate accounts by checking the user’s ID against the database, validates a 
South African ID and  creates profiles by adding user details in Supabase, in the ‘profiles’ 
section. I used Firebase Cloud Functions to deploy the backend.

- What went badly:The thing that challenged me the most was getting the phone OTP to work as intended. I 
spent so many hours trying to find why an OTP was not being sent. Two days later, I found 
out that the problem was just that I used localhost to check my work. ReCAPTCHA 
somehow failed while it was loading. I even added localhost to Authorised Domains on 
firebase When I deployed my project on Vercel, the phone OTP worked just fine. Another 
challenge I faced was still with the phone OTP. After working just fine, it just stopped sending 
the OTP here and there. To add on to that, I used my phone number too many times to 
check and make sure it works well, Firebase blocked my phone number for a while due to 
“auth/too-many-requests”. Thus, it made it hard to fix the phone OTP. I had to wait for some 
time. Another problem I faced was trying to deploy my endpoints using Firebase Cloud 
Functions. Initially, I tried using Vercel, then Railway, then Render. However, that also gave 
me a hard time as I was trying to add the branch that contained my backend code. With 
Firebase Cloud Function, that kept failing to deploy. First it was CORS, then my 
environmental variable setup.

- How to improve:I would have just stuck to Google Sign-in instead of both phone OTP and Google sign-in. It 
would have saved me a lot of time. I would not have to deal with the reCAPTCHA issue. I 
would also set my phone number as a test number for phone OTP auth so that i do not get 
blocked again.

**Nhlakanipo**
- What went well:
- What went badly:
- How to improve:

## Sprint 2

**Tlou Kgatla**
- What went well:The group was able to assign tasks quickly and effectively. I was responsible for styling each page using CSS and React. Initially, I kept these technologies separate, but after the team transitioned more fully to React, I adapted by combining both into .jsx files. This allowed me to maintain consistency across the application and efficiently implement design changes.In addition to styling, I managed the group’s documentation on the main pages. This included compiling the sprint retrospective, where I gathered individual retrospectives from each team member and consolidated them into a single sprint-retrospective.md document. All of this work was completed on the main pages by Blessing Kgatla.

- What went badly:I initially struggled to navigate through the pages due to inconsistent and unclear file naming. In addition, several pages were not yet fully functional, which led to errors when I tried to work on them. This slowed down my progress, as I had to wait for my teammates to resolve these issues before I could continue with my assigned tasks.

- How to improve:Going forward, the team needs to improve consistency in file naming and overall project structure to make navigation easier and reduce confusion. Establishing clear naming conventions early on would help everyone locate and work on files more efficiently. In addition, pages should be made functionally stable before further styling or integration work begins, as incomplete features created blockers and slowed progress. Better coordination between development and styling tasks, along with clearer communication about when components are ready, would allow work to flow more smoothly.I should be more proactive in addressing potential blockers early on. This includes raising concerns about unclear file naming and incomplete functionality sooner, rather than waiting until they affect my progress. I can also take initiative in suggesting or helping define consistent naming conventions and project structure to improve navigation for everyone.

**Nthabiseng Lefopana**
- What went well:
- What went badly:
- How to improve:

**Somnotho Mzolo**
- What went well:
- What went badly:
- How to improve:

**Hlulani**
- What went well:
- What went badly:
- How to improve:

**Nhlakanipo**
- What went well:
- What went badly:
- How to improve:

## Sprint 3

*Tlou Kgatla**
- What went well:
- What went badly:
- How to improve:

**Nthabiseng Lefopana**
- What went well:
- What went badly:
- How to improve:

**Somnotho Mzolo**
- What went well:
- What went badly:
- How to improve:

**Hlulani**
- What went well:
- What went badly:
- How to improve:

**Nhlakanipo**
- What went well:
- What went badly:
- How to improve:

## Sprint 4

*Tlou Kgatla**
- What went well:
- What went badly:
- How to improve:

**Nthabiseng Lefopana**
- What went well:
- What went badly:
- How to improve:

**Somnotho Mzolo**
- What went well:
- What went badly:
- How to improve:

**Hlulani**
- What went well:
- What went badly:
- How to improve:

**Nhlakanipo**
- What went well:
- What went badly:
- How to improve:
