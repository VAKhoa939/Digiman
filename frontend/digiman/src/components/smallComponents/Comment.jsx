import React from 'react'

export function Comment() {
    return (
      <div style={styleSheet.root}>
        {/*image conatiner*/}
        <img/>
        {/*infor conatiner*/}
        <div>
            <h1>
            Username
            </h1>
            <p>x days ago</p>
            <h4>Comment here!</h4>
        
        </div>
      </div>
    )
}

const styleSheet = {
    root: {
        backGroundColor: "#121212",
        //color: "white",
    },
    userName:{
        paddingBottom: 0,
    },
    dayAgo:{
        marginTop: "1px",
        

    }
}
