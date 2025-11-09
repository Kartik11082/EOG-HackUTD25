import './App.css'
import PotionNetworkMap from '../components/Output2/CauldronWatch'
import CauldronWatch from '../components/Output1/PotionNetworkMap'
import DiscrepanciesViewer from '../components/Output3/DiscrepanciesViewer'
import CourierRouteOptimizer from '../components/outputBonus/courierRouteOptimizer'


function App() {

  return (
    <>
      <CauldronWatch />
      <PotionNetworkMap />
      <DiscrepanciesViewer />
      <CourierRouteOptimizer />
    </>
  )
}

export default App
