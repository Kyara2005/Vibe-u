import About from "../components/about/About"
import Beneficios from "../components/beneficios/Beneficios"
import Contact from "../components/contact/Contact"
import ExploraConecta from "../components/ExploraConecta/ExploraConecta"
import Footer from "../components/footer/Footer"
import Header from "../components/header/Header"
import HowItWorks from "../components/how/HowItWorks"
import ProblemSolution from "../components/problemSolution/ProblemSolution"
import Descarga from "../components/descarga/Descarga"


const Landing = () => {
    return (
        <>
            <div data-aos="fade-down">
                <Header />
            </div>
            <div data-aos="zoom-in" data-aos-duration="1500">
                <About />
            </div>
            <div data-aos="flip-left" data-aos-duration="1500">
                <ProblemSolution />
            </div>
            <div data-aos="zoom-in" data-aos-duration="1500">
                <Beneficios />
            </div>
            <div data-aos="fade-down" data-aos-duration="1000">
                <HowItWorks />
            </div>
            <div data-aos="zoom-in" data-aos-duration="1500">
                <ExploraConecta />
            </div>
            <div data-aos="zoom-in" data-aos-duration="1500">
                <Contact />
            </div>
            <div data-aos="fade-down" data-aos-duration="1000">
                <Descarga />
            </div>
            <Footer />
        </>
    )
}

export default Landing
